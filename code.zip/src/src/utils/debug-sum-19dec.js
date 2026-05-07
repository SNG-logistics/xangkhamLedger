
const db = require('../config/db');

async function run() {
    try {
        console.log('Searching for period 2025-12-19...');
        // Find the period by date to be sure of the ID
        const [periods] = await db.query('SELECT * FROM periods WHERE period_date = ?', ['2025-12-19']);

        if (periods.length === 0) {
            console.log('Period 2025-12-19 not found in DB!');
            // Fallback: list all periods
            const [allPeriods] = await db.query('SELECT id, period_date FROM periods LIMIT 5');
            console.log('Available periods:', allPeriods);
            return;
        }

        const period = periods[0];
        console.log(`Found Period: ID=${period.id}, Date=${period.period_date}`);
        const periodId = period.id;

        console.log('\n--- Active Expenses (is_deleted = 0) ---');
        const [activeExpenses] = await db.query(`
            SELECT id, description, amount_lak, is_deleted 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = FALSE
        `, [periodId]);

        let calculatedSum = 0;
        activeExpenses.forEach(exp => {
            console.log(`[ACTIVE] ID: ${exp.id} | Desc: "${exp.description}" | Amount: ${exp.amount_lak}`);
            calculatedSum += parseFloat(exp.amount_lak);
        });

        console.log('\n--- Deleted Expenses (is_deleted = 1) ---');
        const [deletedExpenses] = await db.query(`
            SELECT id, description, amount_lak, is_deleted 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = TRUE
        `, [periodId]);

        deletedExpenses.forEach(exp => {
            console.log(`[DELETED] ID: ${exp.id} | Desc: "${exp.description}" | Amount: ${exp.amount_lak}`);
        });

        console.log('\n--- Totals ---');
        console.log(`Manual Sum of Active (JS): ${calculatedSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

        const [dbSum] = await db.query(`
            SELECT COALESCE(SUM(amount_lak), 0) as total_lak 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = FALSE
        `, [periodId]);

        console.log(`DB Query Sum (SQL): ${parseFloat(dbSum[0].total_lak).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

run();
