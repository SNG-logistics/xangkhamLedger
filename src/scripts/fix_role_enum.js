require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixRoleEnum() {
    console.log('🔌 Connecting to database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'changkhum_ledger'
    });

    try {
        console.log('🛠️ Fixing users table schema...');

        // Check current columns first (optional but good for log)
        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
        console.log('Current role definition:', columns[0].Type);

        // Force update including CEO
        const sql = "ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF', 'VIEWER', 'CEO') NOT NULL DEFAULT 'STAFF'";
        await connection.query(sql);

        console.log('✅ Successfully updated role column to include CEO!');

        // Verify
        const [newColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
        console.log('New role definition:', newColumns[0].Type);

    } catch (error) {
        console.error('❌ Error fixing schema:', error.message);
    } finally {
        await connection.end();
        console.log('🔌 Disconnected.');
    }
}

fixRoleEnum();
