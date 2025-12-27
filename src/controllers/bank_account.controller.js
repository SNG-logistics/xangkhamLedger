// FILE: src/controllers/bank_account.controller.js
const BankAccount = require('../models/bank_account.model');
const audit = require('../middleware/audit');

const bankAccountController = {
    list: async (req, res) => {
        try {
            const accounts = await BankAccount.findAll();
            // If it's an API request (e.g. for dropdowns via AJAX), return JSON
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(accounts);
            }
            // Otherwise render the management page
            res.render('settings/bank_accounts', {
                accounts,
                title: 'จัดการบัญชีธนาคาร'
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading bank accounts');
        }
    },

    create: async (req, res) => {
        try {
            const { bank_name, account_name, account_number, type } = req.body;

            if (!bank_name || !account_name || !account_number) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const id = await BankAccount.create({ bank_name, account_name, account_number, type });

            // Audit
            await audit.log(
                req.session.userId, 'CREATE_BANK_ACCOUNT', 'bank_accounts', id, null, req.body, null, req.ip, req.get('User-Agent')
            );

            res.json({ success: true, id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error creating bank account' });
        }
    },

    update: async (req, res) => {
        try {
            const id = req.params.id;
            const { bank_name, account_name, account_number, type, is_active } = req.body;

            await BankAccount.update(id, {
                bank_name, account_name, account_number, type,
                is_active: is_active === 'true' || is_active === true || is_active === 1
            });

            // Audit (simplified, ideally fetch before/after)
            await audit.log(
                req.session.userId, 'UPDATE_BANK_ACCOUNT', 'bank_accounts', id, null, req.body, null, req.ip, req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error updating bank account' });
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params.id;
            const { reason } = req.body; // Expect JSON body with reason

            if (!reason) {
                return res.status(400).json({ error: 'กรุณาระบุเหตุผลการลบ (Reason is required)' });
            }

            await BankAccount.delete(id);

            // Audit
            await audit.log(
                req.session.userId,
                'DELETE_BANK_ACCOUNT',
                'bank_accounts',
                id,
                null,
                null,
                reason, // Log the reason
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting bank account' });
        }
    }
};

module.exports = bankAccountController;
