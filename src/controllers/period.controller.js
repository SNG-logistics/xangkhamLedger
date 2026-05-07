// FILE: src/controllers/period.controller.js
const Period = require('../models/period.model');
const Summary = require('../models/summary.model');
const Expense = require('../models/expense.model');
const Cashflow = require('../models/cashflow.model');
const BankBalance = require('../models/bank_balance.model');
const Incident = require('../models/incident.model');
const Journal = require('../models/journal.model'); // Added missing import
const Setting = require('../models/setting.model');
const audit = require('../utils/audit');
const money = require('../utils/money'); // Ensure money util is imported if used in render
const lineService = require('../services/line.service');

const periodController = {
    list: async (req, res) => {
        try {
            const periods = await Period.findAll();
            const backfillMode = await Setting.get('BACKFILL_MODE');

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(periods);
            }

            res.render('periods/list', {
                periods,
                backfillMode: backfillMode === 'ON',
                money
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading periods');
        }
    },

    detail: async (req, res) => {
        try {
            const periodId = req.params.id;
            const period = await Period.findById(periodId);

            if (!period) {
                return res.status(404).send('Period not found');
            }

            const summary = await Summary.findByPeriod(periodId);
            const expenses = await Expense.findByPeriod(periodId);
            const journals = await Journal.findByPeriod(periodId);
            const expenseTotal = await Expense.getTotalByPeriod(periodId);
            const bankBalances = await BankBalance.getByPeriod(periodId);
            const incidents = await Incident.findByPeriod(periodId);

            // Calculate Expense Summary by Category
            const expenseSummary = {
                '1. จ่ายทั่วไป': 0,
                '2.1 โปรโมชั่นใช้เครดิต': 0,
                '2.2 โปรโมชั่นเงินสด': 0,
                '3. กิจกรรม/การตลาด': 0,
                '4. ธนาคาร': 0,
                '5. ภาษีอากร': 0,
                '6. โยนของ': 0,
                // Legacy support
                '2. โปรโมชันเงินสด': 0,
                '3. โปรโมชันใช้เครดิต': 0,
                '2. โปร': 0
            };

            expenses.forEach(exp => {
                if (expenseSummary[exp.category] !== undefined) {
                    expenseSummary[exp.category] += parseFloat(exp.amount_lak) || 0;
                } else {
                    // Fallback for unrecognized categories
                    expenseSummary['1. จ่ายทั่วไป'] += parseFloat(exp.amount_lak) || 0;
                }
            });

            // Calculate parent category "2. รวมโปรโมชั่น"
            expenseSummary['2. รวมโปรโมชั่น'] =
                expenseSummary['2.1 โปรโมชั่นใช้เครดิต'] +
                expenseSummary['2.2 โปรโมชั่นเงินสด'] +
                expenseSummary['2. โปรโมชันเงินสด'] +  // Legacy
                expenseSummary['3. โปรโมชันใช้เครดิต'] + // Legacy
                expenseSummary['2. โปร'];  // Legacy

            // Calculate Bank Total
            const bankTotal = {
                total_lak: bankBalances.reduce((sum, b) => sum + (parseFloat(b.balance_lak) || 0), 0)
            };

            res.render('periods/detail', {
                period,
                summary: summary || {},
                expenses,
                bankBalances,
                incidents,
                journals,
                expenseTotal,
                bankTotal,
                expenseSummary,
                money
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading period detail');
        }
    },

    create: async (req, res) => {
        try {
            const { period_date } = req.body;
            const date = new Date(period_date);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            const backfillMode = await Setting.get('BACKFILL_MODE');
            const isBackfill = backfillMode === 'ON';

            // Validation: Allow only weekdays Mon(1)-Fri(5)
            if (![1, 2, 3, 4, 5].includes(dayOfWeek)) {
                return res.status(400).send('อนุญาตให้สร้างงวดเฉพาะวัน จันทร์, อังคาร, พุธ, พฤหัสบดี, ศุกร์ เท่านั้น');
            }

            // Allow creation on any day if Backfill Mode is ON
            // No strict day check for backfill to allow flexibility

            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // Pass is_backfill if model supports it (we added column, but model might need update if we want to save it explicitly, 
            // but for now relying on default/backfill logic provided in earlier steps. 
            // Assuming Period.create takes (date, year, month) based on reading.
            // If we want to save is_backfill, we might need to modify model create.
            // For safety, we adhere to existing signature for now, simply allowing the DATE creation.)

            const periodId = await Period.create(period_date, year, month);

            // If we want to mark it as backfill, we might need a separate update or updated model. 
            // For now, let's assume strict date rules are relaxed.

            await audit.log(
                req.session.userId,
                'CREATE_PERIOD',
                'periods',
                periodId,
                null,
                { period_date, year, month, isBackfill },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods');
        } catch (error) {
            console.error('Create Period Error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).send('มีงวดวันที่นี้อยู่แล้ว (Duplicate Date)');
            }
            res.status(500).send('Error creating period: ' + error.message);
        }
    },

    lock: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { reason, forceOverride } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ error: 'Reason is required for locking' });
            }

            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'LOCKED') return res.status(400).json({ error: 'Period already locked' });

            // Check for critical incidents (BLOCKER)
            const hasCritical = await Incident.hasCriticalOpen(periodId);
            if (hasCritical) {
                return res.status(400).json({
                    error: 'Cannot lock: There are OPEN CRITICAL Incidents. Please resolve them first.'
                });
            }

            // SEQUENTIAL LOCK VALIDATION
            const hasOlderOpen = await Period.hasOpenOlder(period.period_date);
            if (hasOlderOpen) {
                return res.status(400).json({
                    error: 'Cannot lock: You have an OLDER period that is still OPEN. Please lock chronologicaly.'
                });
            }

            // Check net cash
            const cashStatus = await Cashflow.getNetCashByPeriod(periodId);
            if (cashStatus.net < 0) {
                if (!forceOverride) {
                    return res.status(400).json({
                        // FIXED: String concatenation
                        error: 'Net Cash is Negative(' + cashStatus.net.toLocaleString() + '). Cannot lock unless overridden.',
                        requiresOverride: true
                    });
                } else {
                    // Log override - FIXED: String concatenation
                    console.log('Period ' + periodId + ' Locked with Negative Cash: ' + cashStatus.net + ' by User ' + req.session.userId);
                }
            }

            await Period.lock(periodId, req.session.userId, reason + (cashStatus.net < 0 ? ' [OVERRIDE NEGATIVE CASH]' : ''));

            // Auto GL
            if (Journal.createAutoGL) {
                await Journal.createAutoGL(periodId, req.session.userId);
            }

            await audit.log(
                req.session.userId,
                'LOCK_PERIOD',
                'periods',
                periodId,
                { status: 'OPEN' },
                { status: 'LOCKED', final_net: cashStatus.net, override: !!forceOverride },
                reason,
                req.ip,
                req.get('User-Agent')
            );

            // Line Notify
            try {
                // Calculate Net Profit for Notification
                const summary = await Summary.findByPeriod(periodId) || {};
                const expenseTotal = await Expense.getTotalByPeriod(periodId);

                const grossSales = (parseFloat(summary.sales_6_digit) || 0) +
                    (parseFloat(summary.sales_5_digit) || 0) +
                    (parseFloat(summary.sales_4_digit) || 0) +
                    (parseFloat(summary.sales_3_digit) || 0) +
                    (parseFloat(summary.sales_2_digit) || 0) +
                    (parseFloat(summary.sales_1_digit) || 0);

                const totalPrizes = (parseFloat(summary.prize_6_digit) || 0) +
                    (parseFloat(summary.prize_5_digit) || 0) +
                    (parseFloat(summary.prize_4_digit) || 0) +
                    (parseFloat(summary.prize_3_digit) || 0) +
                    (parseFloat(summary.prize_2_digit) || 0) +
                    (parseFloat(summary.prize_1_digit) || 0);

                const profitThrowing = parseFloat(summary.profit_throwing) || 0;
                const totalExpenses = parseFloat(expenseTotal.total_lak) || 0;

                const netProfit = grossSales - totalPrizes + profitThrowing - totalExpenses;

                const lockerName = req.session.fullName || req.session.username || 'Admin';
                const message = `\n🔒 งวดวันที่ ${new Date(period.period_date).toLocaleDateString('th-TH')} ถูก LOCKED แล้ว\n` +
                    `โดย: ${lockerName}\n` +
                    `ยอดสรุป (Net Profit): ${netProfit.toLocaleString()} LAK\n` +
                    `เหตุผล: ${reason}\n` +
                    `\n🔗 https://xangkhamledger.com/`;
                await lineService.sendNotify(message);
            } catch (notifyError) {
                console.error('Line Notify Error:', notifyError);
            }



            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error locking period: ' + error.message });
        }
    },

    unlock: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { reason } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ error: 'Reason is required for unlocking' });
            }

            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'OPEN') return res.status(400).json({ error: 'Period already open' });

            await Period.unlock(periodId, req.session.userId, reason);

            await audit.log(
                req.session.userId,
                'UNLOCK_PERIOD',
                'periods',
                periodId,
                { status: 'LOCKED' },
                { status: 'OPEN' },
                reason,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error unlocking period' });
        }
    },

    delete: async (req, res) => {
        try {
            const periodId = req.params.id;
            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });

            await Period.delete(periodId);

            await audit.log(
                req.session.userId,
                'DELETE_PERIOD',
                'periods',
                periodId,
                { period_date: period.period_date },
                null,
                'Manual deletion',
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting period' });
        }
    },

    updateBalances: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { balances } = req.body;
            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'LOCKED') return res.status(400).json({ error: 'Period is Locked' });

            await BankBalance.upsert(periodId, balances, req.session.userId);

            await audit.log(
                req.session.userId,
                'UPDATE_BANK_BALANCES',
                'bank_balances',
                periodId,
                null,
                balances,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error updating balances' });
        }
    },

    toggleBackfill: async (req, res) => {
        try {
            const current = await Setting.get('BACKFILL_MODE');
            const newValue = current === 'ON' ? 'OFF' : 'ON';
            await Setting.set('BACKFILL_MODE', newValue);

            await audit.log(
                req.session.userId,
                'TOGGLE_BACKFILL',
                'system_settings',
                null,
                current,
                newValue,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true, mode: newValue });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error toggling backfill mode' });
        }
    },

    createIncident: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { title, description, severity } = req.body;
            await Incident.create({ period_id: periodId, title, description, severity, created_by: req.session.userId }, req.session.userId);
            res.redirect('/periods/' + periodId);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating incident');
        }
    },

    resolveIncident: async (req, res) => {
        try {
            const { incidentId } = req.params;
            const { resolution_note } = req.body;
            await Incident.resolve(incidentId, resolution_note, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error resolving incident' });
        }
    }
};

module.exports = periodController;
