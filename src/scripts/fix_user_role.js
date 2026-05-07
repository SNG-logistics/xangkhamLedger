require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixUserRole() {
    console.log('🔌 Connecting to database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'changkhum_ledger'
    });

    try {
        const targetUsername = 'admin111'; // The user reported in previous logs
        const targetRole = 'CEO';

        console.log(`🛠️ Updating role for user '${targetUsername}' to '${targetRole}'...`);

        const [result] = await connection.query(
            "UPDATE users SET role = ? WHERE username = ?",
            [targetRole, targetUsername]
        );

        if (result.matchedRows === 0) {
            console.log(`⚠️ User '${targetUsername}' not found. Reviewing all users...`);
            const [users] = await connection.query("SELECT id, username, role FROM users");
            console.table(users);
        } else {
            console.log(`✅ Successfully updated ${result.changedRows} user(s).`);

            // Verify
            const [user] = await connection.query("SELECT id, username, role FROM users WHERE username = ?", [targetUsername]);
            console.log('User status now:', user[0]);
        }

    } catch (error) {
        console.error('❌ Error updating role:', error.message);
    } finally {
        await connection.end();
        console.log('🔌 Disconnected.');
    }
}

fixUserRole();
