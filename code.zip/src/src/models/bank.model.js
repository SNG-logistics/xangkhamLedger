// FILE: src/models/bank.model.js
const db = require('../config/db');

// Bank balance operations (per period, per master bank account)
const Bank = {
    findByPeriod: async (periodId) => {
        // Show all active master accounts with their balance in the given period (if any)
        const [rows] = await db.query(`
            SELECT 
                bb.id AS balance_id,
                ba.id AS bank_account_id,
                ba.bank_name,
                ba.account_number,
                ba.account_name,
                COALESCE(bb.balance_lak, 0) AS balance_lak,
                bb.notes
            FROM bank_accounts ba
            LEFT JOIN bank_balances bb 
                ON ba.id = bb.bank_account_id 
                AND bb.period_id = ?
            WHERE ba.is_active = TRUE
            ORDER BY ba.id ASC
        `, [periodId]);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM bank_balances WHERE id = ?', [id]);
        return rows[0];
    },

    // Upsert balance for a period/account combo
    create: async (periodId, bankAccountId, balanceLak, notes, userId) => {
        const [result] = await db.query(`
            INSERT INTO bank_balances (period_id, bank_account_id, balance_lak, notes, updated_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                balance_lak = VALUES(balance_lak),
                notes = VALUES(notes),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
        `, [periodId, bankAccountId, balanceLak || 0, notes, userId]);

        if (result.insertId) return result.insertId;

        // On duplicate, fetch existing id
        const [existing] = await db.query(
            'SELECT id FROM bank_balances WHERE period_id = ? AND bank_account_id = ?',
            [periodId, bankAccountId]
        );
        return existing[0]?.id;
    },

    update: async (id, bankAccountId, balanceLak, notes, userId) => {
        await db.query(
            `
            UPDATE bank_balances
            SET bank_account_id = ?, balance_lak = ?, notes = ?, updated_by = ?, updated_at = NOW()
            WHERE id = ?
        `,
            [bankAccountId, balanceLak || 0, notes, userId, id]
        );
    },

    delete: async (id) => {
        await db.query('DELETE FROM bank_balances WHERE id = ?', [id]);
    },

    getTotalByPeriod: async (periodId) => {
        const [rows] = await db.query(
            `
            SELECT COALESCE(SUM(balance_lak), 0) AS total_lak
            FROM bank_balances
            WHERE period_id = ?
        `,
            [periodId]
        );
        return rows[0];
    }
};

module.exports = Bank;
