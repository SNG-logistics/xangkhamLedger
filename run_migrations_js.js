// FILE: run_migrations_js.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'changkhum_ledger',
    multipleStatements: true
};

async function run() {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection(dbConfig);
    console.log('Connected!');

    const files = [
        'sql/004_bank_accounts.sql', // Add this
        'sql/006_update_bank_balances.sql',
        'sql/007_incidents.sql',
        'sql/008_backfill.sql'
    ];

    for (const file of files) {
        console.log(`Running ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        try {
            await conn.query(sql);
            console.log(`✅ ${file} Success!`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log(`⚠️ ${file} already applied (Skipping)`);
            } else {
                console.error(`❌ Error in ${file}:`, err.message);
            }
        }
    }

    console.log('Done!');
    process.exit();
}

run().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
