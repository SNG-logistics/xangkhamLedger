require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function ensureAdmin() {
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

        // Check if admin exists
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);

        if (rows.length > 0) {
            // Update existing
            await connection.query('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
            console.log('✅ Admin password updated successfully!');
        } else {
            // Insert new
            await connection.query(`
        INSERT INTO users (username, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin', hash, 'Super Administrator', 'SUPER_ADMIN', true]);
            console.log('✅ Admin user created successfully!');
        }

        console.log('---------------------------');
        console.log('👉 Username: admin');
        console.log('👉 Password: admin123');
        console.log('---------------------------');

        await connection.end();
    } catch (err) {
        console.error('Error ensuring admin:', err);
    }
}

ensureAdmin();
