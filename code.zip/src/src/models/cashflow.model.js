// FILE: src/models/cashflow.model.js
const db = require('../config/db');

const Cashflow = {
    findAll: async (limit = 100) => {
        const [rows] = await db.query(`
            SELECT t.*, 
                   p.period_date,
                   b1.bank_name as from_bank_name, b1.account_name as from_account_name,
                   b2.bank_name as to_bank_name, b2.account_name as to_account_name,
                   u.username as created_by_username
            FROM cashflow_transactions t
            JOIN periods p ON t.period_id = p.id
            LEFT JOIN bank_accounts b1 ON t.bank_account_id = b1.id
            LEFT JOIN bank_accounts b2 ON t.to_bank_account_id = b2.id
            JOIN users u ON t.created_by = u.id
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT ?
        `, [limit]);
        return rows;
    },

    findByPeriod: async (periodId) => {
        const [rows] = await db.query(`
            SELECT t.*, 
                   b1.bank_name as from_bank_name, b1.account_name as from_account_name,
                   b2.bank_name as to_bank_name, b2.account_name as to_account_name,
                   u.username as created_by_username
            FROM cashflow_transactions t
            LEFT JOIN bank_accounts b1 ON t.bank_account_id = b1.id
            LEFT JOIN bank_accounts b2 ON t.to_bank_account_id = b2.id
            JOIN users u ON t.created_by = u.id
            WHERE t.period_id = ?
            ORDER BY t.transaction_date DESC
        `, [periodId]);
        return rows;
    },

    create: async (data, userId) => {
        const {
            transaction_date, period_id, type, category, amount,
            bank_account_id, to_bank_account_id, description
        } = data;

        const [result] = await db.query(
            `INSERT INTO cashflow_transactions 
            (transaction_date, period_id, type, category, amount, bank_account_id, to_bank_account_id, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [transaction_date, period_id, type, category, amount, bank_account_id || null, to_bank_account_id || null, description, userId]
        );
        return result.insertId;
    },

    delete: async (id) => {
        await db.query('DELETE FROM cashflow_transactions WHERE id = ?', [id]);
        return true;
    },

    getNetCashByPeriod: async (periodId) => {
        const [rows] = await db.query(`
            SELECT 
                SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE 0 END) as total_inflow,
                SUM(CASE WHEN type = 'OUTFLOW' THEN amount ELSE 0 END) as total_outflow
            FROM cashflow_transactions
            WHERE period_id = ?
        `, [periodId]);

        const inflow = Number(rows[0].total_inflow || 0);
        const outflow = Number(rows[0].total_outflow || 0);

        return {
            inflow,
            outflow,
            net: inflow - outflow
        };
    }
};

module.exports = Cashflow;
