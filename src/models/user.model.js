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

    create: async (username, password, fullName, role = 'SUPER_ADMIN') => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, fullName, role]
        );
        return result.insertId;
    }
};

module.exports = User;
