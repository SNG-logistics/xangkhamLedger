// FILE: src/utils/init-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDb() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    };

    console.log('🔌 Connecting to MySQL...');

    try {
        // Connect without database selected first
        const connection = await mysql.createConnection(config);

        console.log('🔨 Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'changkhum_ledger'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        console.log(`➡️  Switching to database: ${process.env.DB_NAME || 'changkhum_ledger'}`);
        await connection.changeUser({ database: process.env.DB_NAME || 'changkhum_ledger' });

        // Read SQL files
        const schemaSql = fs.readFileSync(path.join(__dirname, '../../sql/001_schema.sql'), 'utf8');
        const seedSql = fs.readFileSync(path.join(__dirname, '../../sql/002_seed_superadmin.sql'), 'utf8');

        console.log('📄 Executing 001_schema.sql...');
        await connection.query(schemaSql);

        console.log('🌱 Executing 002_seed_superadmin.sql...');
        await connection.query(seedSql);

        console.log('✅ Database setup completed successfully!');
        await connection.end();

    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('👉 Please check your DB_PASSWORD in the .env file.');
        }
        process.exit(1);
    }
}

initDb();
