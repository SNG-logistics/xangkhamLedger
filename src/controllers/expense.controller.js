// FILE: src/controllers/expense.controller.js
const Expense = require('../models/expense.model');
const timeRule = require('../utils/timeRule');
const db = require('../config/db');
const audit = require('../middleware/audit');
const path = require('path');

const expenseController = {
    index: async (req, res) => {
        try {
            const periods = await require('../models/period.model').findAll();
            res.render('expenses/index', { periods });
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
            res.render('expenses/list', { expenses, periodId });
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

            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating expense');
        }
    },

    update: async (req, res) => {
        try {
            const { id, occurred_at, category, description, amount_lak, amount_thb, period_id } = req.body;

            const accountingPeriodId = await timeRule.calculateAccountingPeriod(occurred_at, db);

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

            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating expense');
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;

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
