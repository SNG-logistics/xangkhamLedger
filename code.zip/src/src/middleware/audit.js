// FILE: src/middleware/audit.js
const db = require('../config/db');

const audit = {
    log: async (userId, action, tableName, recordId, beforeJson, afterJson, reason, ip, userAgent) => {
        try {
            await db.query(`
        INSERT INTO audit_log 
        (user_id, action, table_name, record_id, before_json, after_json, reason, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                userId,
                action,
                tableName || null,
                recordId || null,
                beforeJson ? JSON.stringify(beforeJson) : null,
                afterJson ? JSON.stringify(afterJson) : null,
                reason || null,
                ip || null,
                userAgent || null
            ]);
        } catch (error) {
            console.error('Audit log error:', error);
        }
    },

    middleware: (action) => {
        return async (req, res, next) => {
            const userId = req.session?.userId || null;
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            req.audit = {
                log: async (tableName, recordId, beforeJson, afterJson, reason) => {
                    await audit.log(userId, action, tableName, recordId, beforeJson, afterJson, reason, ip, userAgent);
                }
            };

            next();
        };
    }
};

module.exports = audit;
