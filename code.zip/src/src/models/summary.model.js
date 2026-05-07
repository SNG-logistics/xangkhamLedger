// FILE: src/models/summary.model.js
const db = require('../config/db');

const Summary = {
    findByPeriod: async (periodId) => {
        const [rows] = await db.query(
            'SELECT * FROM sales_summaries WHERE period_id = ?',
            [periodId]
        );
        return rows[0];
    },

    upsert: async (periodId, salesData, salesThb, files, notes, userId) => {
        const existing = await Summary.findByPeriod(periodId);

        const {
            sales_6_digit, prize_6_digit,
            sales_5_digit, prize_5_digit,
            sales_4_digit, prize_4_digit,
            sales_3_digit, prize_3_digit,
            sales_2_digit, prize_2_digit,
            sales_1_digit, prize_1_digit,
            total_sales_lak // calculated total
        } = salesData;

        if (existing) {
            await db.query(`
        UPDATE sales_summaries
        SET sales_lak = ?, sales_thb = ?, attached_files = ?, notes = ?, updated_at = NOW(),
            sales_6_digit = ?, prize_6_digit = ?,
            sales_5_digit = ?, prize_5_digit = ?,
            sales_4_digit = ?, prize_4_digit = ?,
            sales_3_digit = ?, prize_3_digit = ?,
            sales_2_digit = ?, prize_2_digit = ?,
            sales_1_digit = ?, prize_1_digit = ?
        WHERE period_id = ?
      `, [
                total_sales_lak, salesThb, files ? JSON.stringify(files) : null, notes,
                sales_6_digit, prize_6_digit,
                sales_5_digit, prize_5_digit,
                sales_4_digit, prize_4_digit,
                sales_3_digit, prize_3_digit,
                sales_2_digit, prize_2_digit,
                sales_1_digit, prize_1_digit,
                periodId
            ]);
            return existing.id;
        } else {
            const [result] = await db.query(`
        INSERT INTO sales_summaries (
            period_id, sales_lak, sales_thb, attached_files, notes, created_by,
            sales_6_digit, prize_6_digit,
            sales_5_digit, prize_5_digit,
            sales_4_digit, prize_4_digit,
            sales_3_digit, prize_3_digit,
            sales_2_digit, prize_2_digit,
            sales_1_digit, prize_1_digit
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                periodId, total_sales_lak, salesThb, files ? JSON.stringify(files) : null, notes, userId,
                sales_6_digit, prize_6_digit,
                sales_5_digit, prize_5_digit,
                sales_4_digit, prize_4_digit,
                sales_3_digit, prize_3_digit,
                sales_2_digit, prize_2_digit,
                sales_1_digit, prize_1_digit
            ]);
            return result.insertId;
        }
    },

    delete: async (periodId) => {
        await db.query('DELETE FROM sales_summaries WHERE period_id = ?', [periodId]);
    }
};

module.exports = Summary;
