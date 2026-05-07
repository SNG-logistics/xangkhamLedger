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

    upsert: async (periodId, salesData, salesThb, files, notes, userId, profitThrowing = 0, capitalInjection = 0, capitalReturn = 0, openingBalance = 0, preDrawAmount = 0, postDrawAmount = 0, preDrawNote = null, postDrawNote = null, cutoffTime = '20:10:00') => {
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
            profit_throwing = ?, capital_injection = ?, capital_return = ?, opening_balance = ?,
            sales_6_digit = ?, prize_6_digit = ?,
            sales_5_digit = ?, prize_5_digit = ?,
            sales_4_digit = ?, prize_4_digit = ?,
            sales_3_digit = ?, prize_3_digit = ?,
            sales_2_digit = ?, prize_2_digit = ?,
            sales_1_digit = ?, prize_1_digit = ?,
            pre_draw_cash_in_amount = ?, post_draw_cash_in_amount = ?,
            pre_draw_note = ?, post_draw_note = ?, cutoff_time = ?
        WHERE period_id = ?
      `, [
                total_sales_lak, salesThb, files ? JSON.stringify(files) : null, notes,
                profitThrowing, capitalInjection, capitalReturn, openingBalance,
                sales_6_digit, prize_6_digit,
                sales_5_digit, prize_5_digit,
                sales_4_digit, prize_4_digit,
                sales_3_digit, prize_3_digit,
                sales_2_digit, prize_2_digit,
                sales_1_digit, prize_1_digit,
                preDrawAmount, postDrawAmount, preDrawNote, postDrawNote, cutoffTime,
                periodId
            ]);
            return existing.id;
        } else {
            const [result] = await db.query(`
        INSERT INTO sales_summaries (
            period_id, sales_lak, sales_thb, attached_files, notes, created_by, profit_throwing,
            capital_injection, capital_return, opening_balance,
            sales_6_digit, prize_6_digit,
            sales_5_digit, prize_5_digit,
            sales_4_digit, prize_4_digit,
            sales_3_digit, prize_3_digit,
            sales_2_digit, prize_2_digit,
            sales_1_digit, prize_1_digit,
            pre_draw_cash_in_amount, post_draw_cash_in_amount,
            pre_draw_note, post_draw_note, cutoff_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                periodId, total_sales_lak, salesThb, files ? JSON.stringify(files) : null, notes, userId, profitThrowing,
                capitalInjection, capitalReturn, openingBalance,
                sales_6_digit, prize_6_digit,
                sales_5_digit, prize_5_digit,
                sales_4_digit, prize_4_digit,
                sales_3_digit, prize_3_digit,
                sales_2_digit, prize_2_digit,
                sales_1_digit, prize_1_digit,
                preDrawAmount, postDrawAmount, preDrawNote, postDrawNote, cutoffTime
            ]);
            return result.insertId;
        }
    },

    addSettlementEvidence: async (summaryId, bucket, fileUrl, settleXref = null) => {
        await db.query(`
            INSERT INTO closing_settlement_evidence (summary_id, bucket, file_url, settle_xref)
            VALUES (?, ?, ?, ?)
        `, [summaryId, bucket, fileUrl, settleXref]);
    },

    getSettlementEvidence: async (summaryId) => {
        const [rows] = await db.query(`
            SELECT * FROM closing_settlement_evidence WHERE summary_id = ?
        `, [summaryId]);
        return rows;
    },

    delete: async (periodId) => {
        await db.query('DELETE FROM sales_summaries WHERE period_id = ?', [periodId]);
    }
};

module.exports = Summary;
