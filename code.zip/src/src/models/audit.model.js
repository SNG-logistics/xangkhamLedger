// FILE: src/models/audit.model.js
const db = require('../config/db');

const Audit = {
    findAll: async (limit = 100) => {
        const [rows] = await db.query(`
      SELECT a.*, u.username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [limit]);
        return rows;
    },

    findByAction: async (action, limit = 50) => {
        const [rows] = await db.query(`
      SELECT a.*, u.username
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.action = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [action, limit]);
        return rows;
    },

    findLockEvents: async (periodId = null) => {
        let query = `
      SELECT e.*, u.username, p.period_date
      FROM period_lock_events e
      JOIN users u ON e.performed_by = u.id
      JOIN periods p ON e.period_id = p.id
    `;

        const params = [];
        if (periodId) {
            query += ' WHERE e.period_id = ?';
            params.push(periodId);
        }

        query += ' ORDER BY e.created_at DESC LIMIT 100';

        const [rows] = await db.query(query, params);
        return rows;
    }
};

module.exports = Audit;
