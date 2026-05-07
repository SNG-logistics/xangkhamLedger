// FILE: src/models/expense.model.js
const db = require('../config/db');

const Expense = {
    findByPeriod: async (periodId) => {
        const [rows] = await db.query(`
      SELECT * FROM expenses 
      WHERE accounting_period_id = ? AND is_deleted = FALSE
      ORDER BY occurred_at DESC
    `, [periodId]);
        return rows;
    },

    findByDate: async (dateStr) => {
        const [rows] = await db.query(`
      SELECT * FROM expenses 
      WHERE DATE(occurred_at) = ? AND is_deleted = FALSE
    `, [dateStr]);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT * FROM expenses WHERE id = ? AND is_deleted = FALSE',
            [id]
        );
        return rows[0];
    },

    create: async (occurredAt, accountingPeriodId, category, description, amountLak, amountThb, files, userId) => {
        const [result] = await db.query(`
      INSERT INTO expenses 
      (occurred_at, accounting_period_id, category, description, amount_lak, amount_thb, attached_files, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            occurredAt,
            accountingPeriodId,
            category,
            description,
            amountLak || 0,
            amountThb || 0,
            files ? JSON.stringify(files) : null,
            userId
        ]);
        return result.insertId;
    },

    update: async (id, occurredAt, accountingPeriodId, category, description, amountLak, amountThb, files) => {
        await db.query(`
      UPDATE expenses
      SET occurred_at = ?, accounting_period_id = ?, category = ?, description = ?, 
          amount_lak = ?, amount_thb = ?, attached_files = ?, updated_at = NOW()
      WHERE id = ? AND is_deleted = FALSE
    `, [occurredAt, accountingPeriodId, category, description, amountLak || 0, amountThb || 0,
            files ? JSON.stringify(files) : null, id]);
    },

    softDelete: async (id) => {
        await db.query('UPDATE expenses SET is_deleted = TRUE, updated_at = NOW() WHERE id = ?', [id]);
    },

    getTotalByPeriod: async (periodId) => {
        const [rows] = await db.query(`
      SELECT 
        COALESCE(SUM(amount_lak), 0) as total_lak,
        COALESCE(SUM(amount_thb), 0) as total_thb
      FROM expenses
      WHERE accounting_period_id = ? AND is_deleted = FALSE
    `, [periodId]);
        return rows[0];
    }
};

module.exports = Expense;
