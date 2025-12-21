// FILE: src/models/journal.model.js
const db = require('../config/db');

const Journal = {
    createAutoGL: async (periodId, userId) => {
        // สร้าง Journal Entry อัตโนมัติเมื่อ LOCK งวด
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Get period data
            const [periods] = await conn.query('SELECT * FROM periods WHERE id = ?', [periodId]);
            const period = periods[0];

            // Get sales summary
            const [summaries] = await conn.query('SELECT * FROM sales_summaries WHERE period_id = ?', [periodId]);
            const summary = summaries[0] || { sales_lak: 0, sales_thb: 0 };

            // Get expenses
            const [expenses] = await conn.query(`
        SELECT COALESCE(SUM(amount_lak), 0) as total_lak, COALESCE(SUM(amount_thb), 0) as total_thb
        FROM expenses WHERE accounting_period_id = ? AND is_deleted = FALSE
      `, [periodId]);
            const expense = expenses[0];

            // Create journal entry
            const [result] = await conn.query(`
        INSERT INTO journal_entries (period_id, entry_date, entry_type, description, created_by)
        VALUES (?, ?, 'AUTO_GL', ?, ?)
      `, [periodId, period.period_date, `Auto GL for period ${period.period_date}`, userId]);

            const journalId = result.insertId;

            // Create journal lines (simplified example)
            // Sales LAK
            if (summary.sales_lak > 0) {
                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit_lak)
          VALUES (?, '1100', 'Cash LAK', ?)
        `, [journalId, summary.sales_lak]);

                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, credit_lak)
          VALUES (?, '4100', 'Sales Revenue LAK', ?)
        `, [journalId, summary.sales_lak]);
            }

            // Sales THB
            if (summary.sales_thb > 0) {
                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit_thb)
          VALUES (?, '1110', 'Cash THB', ?)
        `, [journalId, summary.sales_thb]);

                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, credit_thb)
          VALUES (?, '4110', 'Sales Revenue THB', ?)
        `, [journalId, summary.sales_thb]);
            }

            // Expenses LAK
            if (expense.total_lak > 0) {
                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit_lak)
          VALUES (?, '5100', 'Expenses LAK', ?)
        `, [journalId, expense.total_lak]);

                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, credit_lak)
          VALUES (?, '1100', 'Cash LAK', ?)
        `, [journalId, expense.total_lak]);
            }

            // Expenses THB
            if (expense.total_thb > 0) {
                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, debit_thb)
          VALUES (?, '5110', 'Expenses THB', ?)
        `, [journalId, expense.total_thb]);

                await conn.query(`
          INSERT INTO journal_lines (journal_entry_id, account_code, account_name, credit_thb)
          VALUES (?, '1110', 'Cash THB', ?)
        `, [journalId, expense.total_thb]);
            }

            await conn.commit();
            return journalId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    findByPeriod: async (periodId) => {
        const [entries] = await db.query(`
      SELECT * FROM journal_entries WHERE period_id = ? ORDER BY entry_date DESC
    `, [periodId]);

        for (let entry of entries) {
            const [lines] = await db.query(`
        SELECT * FROM journal_lines WHERE journal_entry_id = ? ORDER BY id
      `, [entry.id]);
            entry.lines = lines;
        }

        return entries;
    }
};

module.exports = Journal;
