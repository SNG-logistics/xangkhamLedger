require('dotenv').config();
const db = require('../src/config/db');

async function run() {
    try {
        console.log('Resetting bank balances...');
        // Only balance_lak exists in the latest schema (006_update_bank_balances.sql)
        const [result] = await db.query("UPDATE bank_balances SET balance_lak = 0");
        console.log(`✅ Success: Updated ${result.changedRows} rows. All balances set to 0.`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

run();
