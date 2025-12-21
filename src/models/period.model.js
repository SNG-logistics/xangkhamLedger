// FILE: src/models/period.model.js
const db = require('../config/db');

const Period = {
    findAll: async () => {
        const [rows] = await db.query(`
      SELECT p.*, u.username as locked_by_username
      FROM periods p
      LEFT JOIN users u ON p.locked_by = u.id
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

    findByYearMonth: async (year, month) => {
        const [rows] = await db.query(`
      SELECT * FROM periods 
      WHERE period_year = ? AND period_month = ?
      ORDER BY period_date ASC
    `, [year, month]);
        return rows;
    },

    create: async (periodDate, year, month) => {
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
    }
};

module.exports = Period;
