// FILE: src/models/bank.model.js
const db = require('../config/db');

const Bank = {
    findByPeriod: async (periodId) => {
        const [rows] = await db.query(
            'SELECT * FROM bank_balances WHERE period_id = ? ORDER BY bank_name',
            [periodId]
        );
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM bank_balances WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (periodId, bankName, bankAccount, balanceLak, balanceThb, notes, userId) => {
        const [result] = await db.query(`
      INSERT INTO bank_balances 
      (period_id, bank_name, bank_account, balance_lak, balance_thb, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [periodId, bankName, bankAccount, balanceLak || 0, balanceThb || 0, notes, userId]);
        return result.insertId;
    },

    update: async (id, bankAccount, balanceLak, balanceThb, notes) => {
        await db.query(`
      UPDATE bank_balances
      SET bank_account = ?, balance_lak = ?, balance_thb = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [bankAccount, balanceLak || 0, balanceThb || 0, notes, id]);
    },

    delete: async (id) => {
        await db.query('DELETE FROM bank_balances WHERE id = ?', [id]);
    },

    getTotalByPeriod: async (periodId) => {
        const [rows] = await db.query(`
      SELECT 
        COALESCE(SUM(balance_lak), 0) as total_lak,
        COALESCE(SUM(balance_thb), 0) as total_thb
      FROM bank_balances
      WHERE period_id = ?
    `, [periodId]);
        return rows[0];
    }
};

module.exports = Bank;
