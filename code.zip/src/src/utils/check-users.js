require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkUsers() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'changkhum_ledger',
        port: process.env.DB_PORT || 3306
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('🔌 Connected to database:', config.database);

        const [rows] = await connection.query('SELECT * FROM users');
        console.log('👥 Users found:', rows.length);
        console.table(rows);

        await connection.end();
    } catch (err) {
        console.error('❌ Error checking users:', err);
    }
}

checkUsers();
