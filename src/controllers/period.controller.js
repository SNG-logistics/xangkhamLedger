// FILE: src/controllers/period.controller.js
const Period = require('../models/period.model');
const Summary = require('../models/summary.model');
const Expense = require('../models/expense.model');
const Bank = require('../models/bank.model');
const Journal = require('../models/journal.model');
const audit = require('../middleware/audit');
const money = require('../utils/money');

const periodController = {
    list: async (req, res) => {
        try {
            const periods = await Period.findAll();
            res.render('periods/list', { periods, money });
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
            const banks = await Bank.findByPeriod(periodId);
            const journals = await Journal.findByPeriod(periodId);

            const expenseTotal = await Expense.getTotalByPeriod(periodId);



            const bankTotal = await Bank.getTotalByPeriod(periodId);

            res.render('periods/detail', {
                period,
                summary: summary || {},
                expenses,
                banks,
                journals,
                expenseTotal,
                bankTotal,
                money
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading period detail');
        }
    },

    lock: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { reason } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ error: 'Reason is required for locking' });
            }

            const period = await Period.findById(periodId);
            if (!period) {
                return res.status(404).json({ error: 'Period not found' });
            }

            if (period.status === 'LOCKED') {
                return res.status(400).json({ error: 'Period already locked' });
            }

            // Lock the period
            await Period.lock(periodId, req.session.userId, reason);

            // Create auto GL
            await Journal.createAutoGL(periodId, req.session.userId);

            // Audit log
            await audit.log(
                req.session.userId,
                'LOCK_PERIOD',
                'periods',
                periodId,
                { status: 'OPEN' },
                { status: 'LOCKED' },
                reason,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error locking period' });
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
            if (!period) {
                return res.status(404).json({ error: 'Period not found' });
            }

            if (period.status === 'OPEN') {
                return res.status(400).json({ error: 'Period already open' });
            }

            await Period.unlock(periodId, req.session.userId, reason);

            // Audit log
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

    create: async (req, res) => {
        try {
            const { period_date } = req.body;
            const date = new Date(period_date);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            // Validate: Allow only Mon(1), Wed(3), Fri(5)
            if (![1, 3, 5].includes(dayOfWeek)) {
                return res.status(400).send('อนุญาตให้สร้างงวดเฉพาะวัน จันทร์, พุธ, ศุกร์ เท่านั้น');
            }

            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            const periodId = await Period.create(period_date, year, month);

            await audit.log(
                req.session.userId,
                'CREATE_PERIOD',
                'periods',
                periodId,
                null,
                { period_date, year, month },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating period');
        }
    },

    delete: async (req, res) => {
        try {
            const periodId = req.params.id;

            const period = await Period.findById(periodId);
            if (!period) {
                return res.status(404).json({ error: 'Period not found' });
            }

            // Optional: Check if period is empty or allow full cascade delete?
            // User request implies force delete.

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
    }
};

module.exports = periodController;
