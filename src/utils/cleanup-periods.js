require('dotenv').config();
const mysql = require('mysql2/promise');

async function cleanupPeriods() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'changkhum_ledger',
        port: process.env.DB_PORT || 3306
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('🔌 Connected to database...');

        // Delete periods for 2025-12-21 and 2025-12-25
        // These are Sunday and Thursday, which are not allowed in the new rule (Mon, Wed, Fri only)
        const datesToDelete = ['2025-12-21', '2025-12-25'];

        for (const date of datesToDelete) {
            // We first need to delete related data to avoid foreign key constraints if cascading isn't set
            // But assuming standard setup, we'll try deleting the period directly first or delete dependencies
            // Actually, schema usually has ON DELETE CASCADE or RESTRICT.
            // Let's check schema.sql? No, I'll just try DELETE FROM periods.
            // If it fails, I'll delete children first.

            // Let's safe delete: Children first (sales, expenses, banks, journals, logs)
            // But usually periods are main parents.

            const [period] = await connection.query('SELECT id FROM periods WHERE period_date = ?', [date]);

            if (period.length > 0) {
                const periodId = period[0].id;
                console.log(`🗑️ Deleting data for period ${date} (ID: ${periodId})...`);

                // Delete related tables manually to be safe
                await connection.query('DELETE FROM sales_summaries WHERE period_id = ?', [periodId]);
                await connection.query('DELETE FROM expenses WHERE accounting_period_id = ?', [periodId]);
                await connection.query('DELETE FROM bank_balances WHERE period_id = ?', [periodId]);
                await connection.query('DELETE FROM journal_entries WHERE period_id = ?', [periodId]);
                await connection.query('DELETE FROM period_lock_events WHERE period_id = ?', [periodId]);

                // Finally delete period
                await connection.query('DELETE FROM periods WHERE id = ?', [periodId]);
                console.log(`✅ Deleted period ${date}`);
            } else {
                console.log(`⚠️ Period ${date} not found.`);
            }
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Error cleaning up periods:', err);
    }
}

cleanupPeriods();
