// FILE: src/models/setting.model.js
const db = require('../config/db');

const Setting = {
    get: async (key) => {
        const [rows] = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
        return rows.length > 0 ? rows[0].setting_value : null;
    },

    set: async (key, value) => {
        await db.query(`
            INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = ?
        `, [key, value, value]);
    }
};

module.exports = Setting;
