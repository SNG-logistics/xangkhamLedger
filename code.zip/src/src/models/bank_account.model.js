// FILE: src/models/bank_account.model.js
const db = require('../config/db');

const BankAccount = {
    findAll: async () => {
        const [rows] = await db.query('SELECT * FROM bank_accounts ORDER BY is_active DESC, id ASC');
        return rows;
    },

    findActive: async () => {
        const [rows] = await db.query('SELECT * FROM bank_accounts WHERE is_active = TRUE ORDER BY id ASC');
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM bank_accounts WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data) => {
        const { bank_name, account_name, account_number, type } = data;
        const [result] = await db.query(
            'INSERT INTO bank_accounts (bank_name, account_name, account_number, type) VALUES (?, ?, ?, ?)',
            [bank_name, account_name, account_number, type]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { bank_name, account_name, account_number, type, is_active } = data;
        await db.query(
            'UPDATE bank_accounts SET bank_name = ?, account_name = ?, account_number = ?, type = ?, is_active = ? WHERE id = ?',
            [bank_name, account_name, account_number, type, is_active, id]
        );
        return true;
    },

    delete: async (id) => {
        // Soft delete: Set is_active = FALSE
        await db.query('UPDATE bank_accounts SET is_active = FALSE WHERE id = ?', [id]);
        return true;
    }
};

module.exports = BankAccount;
