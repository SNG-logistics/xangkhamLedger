// FILE: src/controllers/bank.controller.js
const Bank = require('../models/bank.model');
const audit = require('../middleware/audit');

const bankController = {
    index: async (req, res) => {
        try {
            // Find all periods to let user filter, or show latest
            const periods = await require('../models/period.model').findAll();
            // Optionally, we could list ALL bank balances, but typically they are period-specific.
            // For now, let's redirect to dashboard or show a period selector.
            // A better approach for "Bank Accounts" sidebar link is to show valid balances across periods.
            // Let's reuse the summary index style: List periods and showing bank status?
            // OR finding all bank balances:
            // const banks = await Bank.findAll(); (Need to implement findAll in model)

            // Simpler: Render a page listing periods to manage bank accounts for
            res.render('banks/index', { periods });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading bank index');
        }
    },

    showForm: async (req, res) => {
        try {
            const periodId = req.params.periodId;
            const banks = await Bank.findByPeriod(periodId);
            res.render('banks/form', { periodId, banks });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading bank form');
        }
    },

    create: async (req, res) => {
        try {
            const { period_id, bank_name, bank_account, balance_lak, balance_thb, notes } = req.body;

            const bankId = await Bank.create(
                period_id,
                bank_name,
                bank_account,
                balance_lak || 0,
                balance_thb || 0,
                notes,
                req.session.userId
            );

            await audit.log(
                req.session.userId,
                'CREATE_BANK_BALANCE',
                'bank_balances',
                bankId,
                null,
                { bank_name, balance_lak, balance_thb },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating bank balance');
        }
    },

    update: async (req, res) => {
        try {
            const { id, bank_account, balance_lak, balance_thb, notes, period_id } = req.body;

            await Bank.update(id, bank_account, balance_lak || 0, balance_thb || 0, notes);

            await audit.log(
                req.session.userId,
                'UPDATE_BANK_BALANCE',
                'bank_balances',
                id,
                null,
                { balance_lak, balance_thb },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods/' + period_id);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating bank balance');
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;

            await Bank.delete(id);

            await audit.log(
                req.session.userId,
                'DELETE_BANK_BALANCE',
                'bank_balances',
                id,
                null,
                null,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting bank balance' });
        }
    }
};

module.exports = bankController;
