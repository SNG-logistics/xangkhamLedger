// FILE: src/utils/audit.js
const db = require('../config/db');

const audit = {
    log: async (userId, action, tableName, recordId, oldValue, newValue, description, ipAddress, userAgent) => {
        try {
            // Check if audit_log table exists (it should based on schema)
            // If table structure matches:
            /*
            CREATE TABLE audit_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                action VARCHAR(50) NOT NULL,
                table_name VARCHAR(50),
                record_id INT,
                old_value JSON,
                new_value JSON,
                description TEXT,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            */

            const query = `
                INSERT INTO audit_log 
                (user_id, action, table_name, record_id, old_value, new_value, description, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Stringify JSON objects if provided
            const oldValStr = oldValue ? JSON.stringify(oldValue) : null;
            const newValStr = newValue ? JSON.stringify(newValue) : null;

            await db.query(query, [
                userId,
                action,
                tableName,
                recordId,
                oldValStr,
                newValStr,
                description,
                ipAddress,
                userAgent
            ]);

        } catch (error) {
            // Silently fail or log to console to avoid breaking the main app flow
            console.error('Audit Log Error:', error.message);
        }
    }
};

module.exports = audit;
