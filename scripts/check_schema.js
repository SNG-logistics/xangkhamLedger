const db = require('../src/config/db');

async function checkColumns() {
    try {
        console.log('--- Table: bank_balances ---');
        const [columns] = await db.query("SHOW COLUMNS FROM bank_balances");
        columns.forEach(col => {
            console.log(`${col.Field} (${col.Type})`);
        });
        console.log('----------------------------');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
