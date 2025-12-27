const db = require('../src/config/db');

async function updateSchema() {
    try {
        console.log('--- Checking Schema for bank_balances ---');

        // 1. Try to add the column
        try {
            console.log('Attempting to ADD column "notes"...');
            await db.query("ALTER TABLE bank_balances ADD COLUMN notes TEXT");
            console.log('✅ Successfully ADDED "notes" column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column "notes" ALREADY EXISTS (This is good).');
            } else {
                console.error('❌ Error adding column:', err.message);
            }
        }

        // 2. Verify columns
        console.log('\n--- Final Column List ---');
        const [columns] = await db.query("SHOW COLUMNS FROM bank_balances");
        columns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type})`);
        });

        const hasNotes = columns.some(c => c.Field === 'notes');
        if (hasNotes) {
            console.log('\n✅ VERIFICATION PASSED: "notes" column is present.');
        } else {
            console.error('\n❌ VERIFICATION FAILED: "notes" column is MISSING.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

updateSchema();
