// FILE: src/models/bank.model.js
const db = require('../config/db');

const Bank = {
    findByPeriod: async (periodId) => {
        // Use LEFT JOIN to show all accounts, similar to BankBalance model
        const [rows] = await db.query(`
            SELECT 
                bb.id,
                ba.id as bank_account_id,
                ba.bank_name, 
                ba.account_number as bank_account, 
                COALESCE(bb.balance_lak, 0) as balance_lak, 
                bb.notes 
            FROM bank_accounts ba
            LEFT JOIN bank_balances bb ON ba.id = bb.bank_account_id AND bb.period_id = ?
            WHERE ba.is_active = TRUE
            ORDER BY ba.id ASC
        `, [periodId]);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM bank_balances WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (periodId, bankName, bankAccount, balanceLak, notes, userId) => {
        const [result] = await db.query(`
      INSERT INTO bank_balances 
      (period_id, bank_name, bank_account, balance_lak, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [periodId, bankName, bankAccount, balanceLak || 0, notes, userId]);
        return result.insertId;
    },

    update: async (id, bankAccount, balanceLak, notes) => {
        await db.query(`
      UPDATE bank_balances
      SET bank_account = ?, balance_lak = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [bankAccount, balanceLak || 0, notes, id]);
    },

    delete: async (id) => {
        await db.query('DELETE FROM bank_balances WHERE id = ?', [id]);
    },

    getTotalByPeriod: async (periodId) => {
        const [rows] = await db.query(`
      SELECT 
        COALESCE(SUM(balance_lak), 0) as total_lak
      FROM bank_balances
      WHERE period_id = ?
    `, [periodId]);
        return rows[0];
    }
};

module.exports = Bank;
