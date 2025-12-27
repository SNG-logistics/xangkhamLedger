// FILE: src/models/bank_balance.model.js
const db = require('../config/db');

const BankBalance = {
    // Get all balances for a period, joined with accounts
    getByPeriod: async (periodId) => {
        const [rows] = await db.query(`
            SELECT 
                ba.id as bank_account_id,
                ba.bank_name,
                ba.account_name,
                ba.account_number,
                COALESCE(bb.balance_lak, 0) as balance_lak,
                bb.updated_at
            FROM bank_accounts ba
            LEFT JOIN bank_balances bb ON ba.id = bb.bank_account_id AND bb.period_id = ?
            WHERE ba.is_active = TRUE
            ORDER BY ba.id ASC
        `, [periodId]);
        return rows;
    },

    // Upsert multiple balances
    upsert: async (periodId, balances, userId) => {
        // balances = [{ bank_account_id, balance_lak }]
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            for (const item of balances) {
                // Determine if exists
                const [existing] = await conn.query(
                    'SELECT id FROM bank_balances WHERE period_id = ? AND bank_account_id = ?',
                    [periodId, item.bank_account_id]
                );

                if (existing.length > 0) {
                    await conn.query(
                        'UPDATE bank_balances SET balance_lak = ?, updated_by = ? WHERE id = ?',
                        [item.balance_lak, userId, existing[0].id]
                    );
                } else {
                    await conn.query(
                        'INSERT INTO bank_balances (period_id, bank_account_id, balance_lak, updated_by) VALUES (?, ?, ?, ?)',
                        [periodId, item.bank_account_id, item.balance_lak, userId]
                    );
                }
            }

            await conn.commit();
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
};

module.exports = BankBalance;
