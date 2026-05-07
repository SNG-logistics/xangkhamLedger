require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetData() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'changkhum_ledger',
        port: process.env.DB_PORT || 3306
    };

    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        const answer = await question('⚠️  WARNING: This will DELETE ALL DATA (Periods, Sales, Expenses, Banks). Users will be kept.\nAre you sure completely? (yes/no): ');

        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Cancelled.');
            process.exit(0);
        }

        const connection = await mysql.createConnection(config);
        console.log('🔌 Connected to database...');

        // Disable FK checks to allow truncation/deletion in any order
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'journal_lines',
            'journal_entries',
            'bank_balances',
            'expenses',
            'sales_summaries',
            'period_lock_events',
            'periods',
            'audit_log'
        ];

        for (const table of tables) {
            console.log(`🗑️  Clearing table: ${table}...`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        // Re-enable FK checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ System Reset Complete! All transaction data has been cleared.');
        console.log('✨ You can now start fresh.');

        await connection.end();
        process.exit(0);

    } catch (err) {
        console.error('❌ Error resetting data:', err);
        process.exit(1);
    }
}

resetData();
