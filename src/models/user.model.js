// FILE: src/models/user.model.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
    findByUsername: async (username) => {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
            [username]
        );
        return rows[0];
    },

    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, username, full_name, role, is_active FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    verifyPassword: async (plainPassword, hashedPassword) => {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    create: async (username, password, fullName, role = 'STAFF') => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, fullName, role]
        );
        return result.insertId;
    },

    findAll: async () => {
        const [rows] = await db.query(
            'SELECT id, username, full_name, role, is_active, created_at, updated_at FROM users ORDER BY id ASC'
        );
        return rows;
    },

    update: async (id, fullName, role, isActive) => {
        await db.query(
            'UPDATE users SET full_name = ?, role = ?, is_active = ? WHERE id = ?',
            [fullName, role, isActive, id]
        );
    },

    changePassword: async (id, newPassword) => {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, id]
        );
    },

    delete: async (id) => {
        // Soft delete or hard delete? Let's check schema. Schema has is_active.
        // But schema comment says "is_active BOOLEAN DEFAULT TRUE".
        // Let's implement hard delete for now as requested "Delete User", or toggle active.
        // Given it's a ledger system, soft delete (is_active=false) is safer, but user asked for "manage user".
        // Let's use Delete SQL command but maybe restrict self-delete in controller.
        await db.query('DELETE FROM users WHERE id = ?', [id]);
    }
};

module.exports = User;
