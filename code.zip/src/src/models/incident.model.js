// FILE: src/models/incident.model.js
const db = require('../config/db');

const Incident = {
    // Find all by period
    findByPeriod: async (periodId) => {
        const [rows] = await db.query(`
            SELECT i.*, u.username as creator_name, r.username as resolver_name
            FROM incidents i
            JOIN users u ON i.created_by = u.id
            LEFT JOIN users r ON i.resolved_by = r.id
            WHERE i.period_id = ?
            ORDER BY i.severity = 'CRITICAL' DESC, i.status = 'OPEN' DESC, i.created_at DESC
        `, [periodId]);
        return rows;
    },

    // Create new
    create: async (data, userId) => {
        const { period_id, title, description, severity } = data;
        const [res] = await db.query(`
            INSERT INTO incidents (period_id, title, description, severity, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [period_id, title, description, severity, userId]);
        return res.insertId;
    },

    // Resolve
    resolve: async (id, note, userId) => {
        await db.query(`
            UPDATE incidents 
            SET status = 'RESOLVED', resolution_note = ?, resolved_by = ?, resolved_at = NOW()
            WHERE id = ?
        `, [note, userId, id]);
        return true;
    },

    // Check if critical open exists
    hasCriticalOpen: async (periodId) => {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count 
            FROM incidents 
            WHERE period_id = ? AND severity = 'CRITICAL' AND status = 'OPEN'
        `, [periodId]);
        return rows[0].count > 0;
    }
};

module.exports = Incident;
