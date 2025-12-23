
const db = require('../config/db');

async function run() {
    try {
        console.log('Searching for period 2025-12-19...');
        const [periods] = await db.query('SELECT * FROM periods WHERE period_date = ?', ['2025-12-19']);

        if (periods.length === 0) {
            console.log('Period not found');
            return;
        }

        const period = periods[0];
        console.log(`Found Period ID: ${period.id}`);

        console.log('\n--- Active Expenses (is_deleted = 0) ---');
        const [activeExpenses] = await db.query(`
            SELECT id, description, amount_lak, is_deleted 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = FALSE
        `, [period.id]);

        let calculatedSum = 0;
        activeExpenses.forEach(exp => {
            console.log(`ID: ${exp.id} | Desc: ${exp.description} | Amount: ${exp.amount_lak}`);
            calculatedSum += parseFloat(exp.amount_lak);
        });

        console.log('\n--- Deleted Expenses (is_deleted = 1) ---');
        const [deletedExpenses] = await db.query(`
            SELECT id, description, amount_lak, is_deleted 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = TRUE
        `, [period.id]);

        deletedExpenses.forEach(exp => {
            console.log(`ID: ${exp.id} | Desc: ${exp.description} | Amount: ${exp.amount_lak} [DELETED]`);
        });

        console.log('\n--- Summary ---');
        console.log(`Calculated Sum (Node.js): ${calculatedSum.toLocaleString()}`);

        const [dbSum] = await db.query(`
            SELECT COALESCE(SUM(amount_lak), 0) as total_lak 
            FROM expenses 
            WHERE accounting_period_id = ? AND is_deleted = FALSE
        `, [period.id]);

        console.log(`DB Query Sum (SQL): ${parseFloat(dbSum[0].total_lak).toLocaleString()}`);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

run();
