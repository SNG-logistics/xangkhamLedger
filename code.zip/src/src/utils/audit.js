// FILE: src/utils/audit.js
const db = require('../config/db');

const audit = {
    // Note: Schema fields (001_schema.sql) use before_json/after_json/reason (no description column)
    log: async (userId, action, tableName, recordId, oldValue, newValue, descriptionOrReason, ipAddress, userAgent) => {
        try {
            const query = `
                INSERT INTO audit_log 
                (user_id, action, table_name, record_id, before_json, after_json, reason, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const beforeStr = oldValue ? JSON.stringify(oldValue) : null;
            const afterStr = newValue ? JSON.stringify(newValue) : null;

            await db.query(query, [
                userId,
                action,
                tableName,
                recordId,
                beforeStr,
                afterStr,
                descriptionOrReason || null,
                ipAddress || null,
                userAgent || null
            ]);

        } catch (error) {
            // Log to console so main flowไม่พัง
            console.error('Audit Log Error:', error.message);
        }
    }
};

module.exports = audit;
