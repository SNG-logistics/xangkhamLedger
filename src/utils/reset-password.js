require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'changkhum_ledger',
        port: process.env.DB_PORT || 3306
    };

    try {
        const connection = await mysql.createConnection(config);
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);

        console.log(`🔑 Generated new hash for '${password}'`);

        const [result] = await connection.query(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [hash, 'admin']
        );

        if (result.matchedRows > 0) {
            console.log('✅ Admin password has been reset successfully!');
            console.log('👉 Username: admin');
            console.log('👉 Password: admin123');
        } else {
            console.log('❌ Admin user not found in database.');
        }

        await connection.end();
    } catch (err) {
        console.error('Error resetting password:', err);
    }
}

resetPassword();
