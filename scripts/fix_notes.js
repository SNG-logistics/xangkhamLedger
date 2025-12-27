const db = require('../src/config/db');

async function fixNotesColumn() {
    try {
        console.log('Checking bank_balances table...');

        // Check if column exists
        const [columns] = await db.query("SHOW COLUMNS FROM bank_balances LIKE 'notes'");

        if (columns.length === 0) {
            console.log('Adding notes column...');
            await db.query("ALTER TABLE bank_balances ADD COLUMN notes TEXT");
            console.log('Successfully added notes column.');
        } else {
            console.log('Column notes already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fixing database:', error);
        process.exit(1);
    }
}

fixNotesColumn();
