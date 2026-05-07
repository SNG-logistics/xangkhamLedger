// FILE: src/models/period.model.js
const db = require('../config/db');

const Period = {
    findAll: async () => {
        const [rows] = await db.query(`
            SELECT p.*, u.username as locked_by_username,
            (COALESCE(s.sales_6_digit, 0) + COALESCE(s.sales_5_digit, 0) + COALESCE(s.sales_4_digit, 0) + COALESCE(s.sales_3_digit, 0) + COALESCE(s.sales_2_digit, 0) + COALESCE(s.sales_1_digit, 0)) as gross_sales,
            (COALESCE(s.prize_6_digit, 0) + COALESCE(s.prize_5_digit, 0) + COALESCE(s.prize_4_digit, 0) + COALESCE(s.prize_3_digit, 0) + COALESCE(s.prize_2_digit, 0) + COALESCE(s.prize_1_digit, 0)) as total_prizes,
            COALESCE(s.profit_throwing, 0) as profit_throwing,
            (SELECT COALESCE(SUM(amount_lak), 0) FROM expenses e WHERE e.accounting_period_id = p.id AND e.is_deleted = FALSE) as total_expenses
            FROM periods p
            LEFT JOIN users u ON p.locked_by = u.id
            LEFT JOIN sales_summaries s ON s.period_id = p.id
            ORDER BY p.period_date DESC
        `);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query(`
      SELECT p.*, u.username as locked_by_username
      FROM periods p
      LEFT JOIN users u ON p.locked_by = u.id
      WHERE p.id = ?
    `, [id]);
        return rows[0];
    },

    findByDate: async (periodDate) => {
        const [rows] = await db.query('SELECT * FROM periods WHERE period_date = ?', [periodDate]);
        return rows[0];
    },

    // Check if there are any OPEN periods older than the given date
    hasOpenOlder: async (date) => {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count 
            FROM periods 
            WHERE period_date < ? AND status = 'OPEN'
        `, [date]);
        return rows[0].count > 0;
    },

    findByYearMonth: async (year, month) => {
        const [rows] = await db.query(`
            SELECT p.*,
            (COALESCE(s.sales_6_digit, 0) + COALESCE(s.sales_5_digit, 0) + COALESCE(s.sales_4_digit, 0) + COALESCE(s.sales_3_digit, 0) + COALESCE(s.sales_2_digit, 0) + COALESCE(s.sales_1_digit, 0)) as gross_sales,
            (COALESCE(s.prize_6_digit, 0) + COALESCE(s.prize_5_digit, 0) + COALESCE(s.prize_4_digit, 0) + COALESCE(s.prize_3_digit, 0) + COALESCE(s.prize_2_digit, 0) + COALESCE(s.prize_1_digit, 0)) as total_prizes,
            COALESCE(s.profit_throwing, 0) as profit_throwing,
            (SELECT COALESCE(SUM(amount_lak), 0) FROM expenses e WHERE e.accounting_period_id = p.id AND e.is_deleted = FALSE) as total_expenses
            FROM periods p
            LEFT JOIN sales_summaries s ON s.period_id = p.id
            WHERE p.period_year = ? AND p.period_month = ?
            ORDER BY p.period_date ASC
        `, [year, month]);
        return rows;
    },

    getPreviousPeriod: async (currentPeriodId) => {
        const [current] = await db.query('SELECT period_date FROM periods WHERE id = ?', [currentPeriodId]);
        if (!current.length) return null;

        const [rows] = await db.query(`
            SELECT * FROM periods 
            WHERE period_date < ? 
            ORDER BY period_date DESC 
            LIMIT 1
        `, [current[0].period_date]);

        return rows[0] || null;
    },

    create: async (periodDate, year, month) => {
        // Validation: Mon/Wed/Fri only
        // Validation logic is now handled in the Controller to support Backfill Mode
        // const date = new Date(periodDate);
        // ... validation removed ...

        // Validation: Time check (Example: prevents creating *past* periods if required, or strictly closing time. 
        // Requirement says "Close < 20:00". This usually applies to betting/editing, not necessarily creating the period record itself.
        // But if we want to enforce creation rules:
        // For now, only Day validation is strictly "engine" related for creation. 
        // The "Close < 20:00" usually implies "Lock automatically" or "Prevent edits". 
        // We will handle "Prevent edits" in RBAC/Controller.

        const [result] = await db.query(
            'INSERT INTO periods (period_date, period_year, period_month) VALUES (?, ?, ?)',
            [periodDate, year, month]
        );
        return result.insertId;
    },

    lock: async (id, userId, reason) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [before] = await conn.query('SELECT * FROM periods WHERE id = ?', [id]);

            await conn.query(`
        UPDATE periods 
        SET status = 'LOCKED', locked_at = NOW(), locked_by = ?
        WHERE id = ?
      `, [userId, id]);

            await conn.query(`
        INSERT INTO period_lock_events 
        (period_id, action, performed_by, reason, before_status, after_status)
        VALUES (?, 'LOCK', ?, ?, ?, ?)
      `, [id, userId, reason, 'OPEN', 'LOCKED']);

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    unlock: async (id, userId, reason) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(`
        UPDATE periods 
        SET status = 'OPEN', locked_at = NULL, locked_by = NULL
        WHERE id = ?
      `, [id]);

            await conn.query(`
        INSERT INTO period_lock_events 
        (period_id, action, performed_by, reason, before_status, after_status)
        VALUES (?, 'UNLOCK', ?, ?, ?, ?)
      `, [id, userId, reason, 'LOCKED', 'OPEN']);

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    delete: async (id) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Delete related data first
            await conn.query('DELETE FROM sales_summaries WHERE period_id = ?', [id]);
            await conn.query('DELETE FROM expenses WHERE accounting_period_id = ?', [id]);
            await conn.query('DELETE FROM bank_balances WHERE period_id = ?', [id]);
            await conn.query('DELETE FROM journal_entries WHERE period_id = ?', [id]);
            await conn.query('DELETE FROM period_lock_events WHERE period_id = ?', [id]);

            // Delete the period
            await conn.query('DELETE FROM periods WHERE id = ?', [id]);

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
};

module.exports = Period;
