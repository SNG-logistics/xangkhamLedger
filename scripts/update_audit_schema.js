require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function updateSchema() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    };

    console.log('Connecting to database...');
    const connection = await mysql.createConnection(config);

    try {
        const sqlPath = path.join(__dirname, '../sql/009_update_audit_log.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim());

        console.log(`Found ${statements.length} statements to execute.`);

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    console.log('Executed:', statement.substring(0, 50) + '...');
                } catch (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log('Column already exists, skipping.');
                    } else {
                        console.error('Error executing statement:', err.message);
                    }
                }
            }
        }

        console.log('Schema update complete!');
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await connection.end();
    }
}

updateSchema();
