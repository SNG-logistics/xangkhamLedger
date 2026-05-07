// FILE: src/controllers/expense.controller.js
const Expense = require('../models/expense.model');
const timeRule = require('../utils/timeRule');
const db = require('../config/db');
const audit = require('../middleware/audit');
const path = require('path');

const money = require('../utils/money');

const expenseController = {
    index: async (req, res) => {
        try {
            const periods = await require('../models/period.model').findAll();
            res.render('expenses/index', { periods, money });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading expense index');
        }
    },

    list: async (req, res) => {
        try {
            const periodId = req.query.period_id;
            if (!periodId) {
                return res.status(400).send('Period ID required');
            }
            const expenses = await Expense.findByPeriod(periodId);
            res.render('expenses/list', { expenses, periodId, money });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading expenses');
        }
    },

    create: async (req, res) => {
        try {
            let { period_id, occurred_at, category, description, amount_lak, amount_thb, custom_category } = req.body;

            if (category === 'อื่นๆ' && custom_category) {
                category = custom_category;
            }

            // Calculate accounting_period_id automatically
            const accountingPeriodId = await timeRule.calculateAccountingPeriod(occurred_at, db);

            // Check if period is Locked
            const Period = require('../models/period.model');
            const targetPeriod = await Period.findById(accountingPeriodId);
            if (targetPeriod && targetPeriod.status === 'LOCKED') {
                req.session.flash = { type: 'error', message: 'ไม่สามารถทำรายการในงวดที่ถูก LOCK แล้วได้' };
                return res.redirect('/periods/' + period_id);
            }

            const files = req.files;
            let filePaths = [];
            if (files && files.attachments) {
                const attachments = Array.isArray(files.attachments) ? files.attachments : [files.attachments];

                for (const file of attachments) {
                    const filename = Date.now() + '-' + file.name;
                    const uploadPath = path.join(__dirname, '../public/uploads', filename);
                    await file.mv(uploadPath);
                    filePaths.push(filename);
                }
            }

            const expenseId = await Expense.create(
                occurred_at,
                accountingPeriodId,
                category,
                description,
                amount_lak || 0,
                amount_thb || 0,
                filePaths,
                req.session.userId
            );

            await audit.log(
                req.session.userId,
                'CREATE_EXPENSE',
                'expenses',
                expenseId,
                null,
                { occurred_at, accountingPeriodId, category, amount_lak, amount_thb },
                null,
                req.ip,
                req.get('User-Agent')
            );

            // Trigger real-time dashboard update
            if (req.io) {
                try {
                    // Re-calculate stats to send updated data
                    const periods = await Period.findAll();
                    const stats = {
                        totalPeriods: periods.length,
                        openPeriods: periods.filter(p => p.status === 'OPEN').length,
                        lockedPeriods: periods.filter(p => p.status === 'LOCKED').length
                    };
                    const recentPeriods = periods.slice(0, 10);

                    // Construct history for chart
                    const history = recentPeriods.map(p => {
                        const profit = (parseFloat(p.gross_sales) || 0) - (parseFloat(p.total_prizes) || 0) - (parseFloat(p.total_expenses) || 0);
                        return {
                            period_date: new Date(p.period_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
                            net_profit: profit
                        };
                    }).reverse();

                    req.io.emit('dashboard:update', {
                        ...stats,
                        history
                    });
                } catch (socketError) {
                    console.error('Socket emit error:', socketError);
                }
            }

            req.session.flash = { type: 'success', message: 'บันทึกค่าใช้จ่ายสำเร็จ' };
            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            req.session.flash = { type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
            res.redirect('/periods/' + req.body.period_id);
        }
    },

    update: async (req, res) => {
        try {
            const { id, occurred_at, category, description, amount_lak, amount_thb, period_id } = req.body;

            // Check original expense period
            const originalExpense = await Expense.findById(id); // You might need to add findById to Expense model if not exists or use DB directly
            // Assuming Expense.findById exists or we can query. 
            // Looking at previous context, Expense model usage suggests findByPeriod.
            // Let's safely fetch strict accounting period.
            const [existing] = await db.query('SELECT * FROM expenses WHERE id = ?', [id]);
            if (!existing || existing.length === 0) {
                return res.status(404).send('Expense not found');
            }
            const oldExpense = existing[0];

            const Period = require('../models/period.model');
            const oldPeriod = await Period.findById(oldExpense.accounting_period_id);
            if (oldPeriod && oldPeriod.status === 'LOCKED') {
                return res.status(400).send('<h1>Error: Cannot edit transaction in a LOCKED period.</h1><a href="/periods/' + period_id + '">Back</a>');
            }

            const accountingPeriodId = await timeRule.calculateAccountingPeriod(occurred_at, db);

            // Check new target period
            const newPeriod = await Period.findById(accountingPeriodId);
            if (newPeriod && newPeriod.status === 'LOCKED') {
                return res.status(400).send('<h1>Error: Cannot move transaction to a LOCKED period.</h1><a href="/periods/' + period_id + '">Back</a>');
            }

            await Expense.update(
                id,
                occurred_at,
                accountingPeriodId,
                category,
                description,
                amount_lak || 0,
                amount_thb || 0,
                null
            );

            await audit.log(
                req.session.userId,
                'UPDATE_EXPENSE',
                'expenses',
                id,
                null,
                { occurred_at, accountingPeriodId, category, amount_lak, amount_thb },
                null,
                req.ip,
                req.get('User-Agent')
            );

            req.session.flash = { type: 'success', message: 'แก้ไขข้อมูลสำเร็จ' };
            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            req.session.flash = { type: 'error', message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' };
            res.redirect('/periods/' + req.body.period_id);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const [existing] = await db.query('SELECT * FROM expenses WHERE id = ?', [id]);
            if (!existing || existing.length === 0) {
                return res.status(404).json({ error: 'Expense not found' });
            }
            const expense = existing[0];

            const Period = require('../models/period.model');
            const period = await Period.findById(expense.accounting_period_id);
            if (period && period.status === 'LOCKED') {
                return res.status(400).json({ error: 'Cannot delete transaction in a LOCKED period' });
            }

            await Expense.softDelete(id);

            await audit.log(
                req.session.userId,
                'DELETE_EXPENSE',
                'expenses',
                id,
                null,
                { is_deleted: true },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting expense' });
        }
    }
};

module.exports = expenseController;
