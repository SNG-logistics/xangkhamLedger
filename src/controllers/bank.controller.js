// FILE: src/controllers/bank.controller.js

const Bank = require('../models/bank.model');
const audit = require('../middleware/audit');
const db = require('../config/db');
const Period = require('../models/period.model');

const bankController = {
    index: async (req, res) => {
        try {
            // Retrieve periods with calculated total bank balance
            const [periods] = await db.query(`
                SELECT p.*,
    (SELECT COALESCE(SUM(balance_lak), 0) FROM bank_balances bb WHERE bb.period_id = p.id) as total_balance_lak,
        (SELECT COUNT(*) FROM bank_balances bb WHERE bb.period_id = p.id) as account_count
                FROM periods p
                ORDER BY p.period_date DESC
    `);

            res.render('banks/index', { periods, money: require('../utils/money') });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading bank index');
        }
    },

    showForm: async (req, res) => {
        try {
            const periodId = req.params.periodId;
            const banks = await Bank.findByPeriod(periodId);
            const masterAccounts = await require('../models/bank_account.model').findActive();

            // ดึงยอดล่าสุดของแต่ละบัญชีย้อนหลังถึงงวดปัจจุบัน เพื่อใช้เป็นค่าเริ่มต้น
            let lastBalances = {};
            const period = await Period.findById(periodId);
            if (period) {
                const [rows] = await db.query(
                    `
                    SELECT bank_account_id, balance_lak
FROM(
    SELECT 
                            bb.bank_account_id,
    bb.balance_lak,
    ROW_NUMBER() OVER(PARTITION BY bb.bank_account_id ORDER BY p.period_date DESC) AS rn
                        FROM bank_balances bb
                        JOIN periods p ON p.id = bb.period_id
                        WHERE p.period_date <= ?
                    ) t
                    WHERE rn = 1
    `,
                    [period.period_date]
                );
                lastBalances = Object.fromEntries(rows.map(r => [r.bank_account_id, r.balance_lak]));
            }

            res.render('banks/form', { periodId, banks, masterAccounts, lastBalances });
        } catch (error) {
            console.error(error);
            res.status(500).send(`Error loading bank form: ${error.message} <br><pre>${error.stack}</pre>`);
        }
    },

    create: async (req, res) => {
        try {
            const { period_id, bank_account_id, balance_lak, notes } = req.body;

            const bankId = await Bank.create(
                period_id,
                bank_account_id,
                balance_lak || 0,
                notes,
                req.session.userId
            );

            await audit.log(
                req.session.userId,
                'CREATE_BANK_BALANCE',
                'bank_balances',
                bankId,
                null,
                { bank_account_id, balance_lak },
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
            const { id, bank_account_id, balance_lak, notes, period_id } = req.body;

            await Bank.update(id, bank_account_id, balance_lak || 0, notes, req.session.userId);

            await audit.log(
                req.session.userId,
                'UPDATE_BANK_BALANCE',
                'bank_balances',
                id,
                null,
                { bank_account_id, balance_lak },
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
            const { reason } = req.body; // Expect JSON body with reason

            await Bank.delete(id);

            await audit.log(
                req.session.userId,
                'DELETE_BANK_BALANCE',
                'bank_balances',
                id,
                null,
                null,
                reason || null, // Create log with reason
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
