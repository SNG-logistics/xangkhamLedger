const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Add columns to sales_summaries
        console.log('Adding columns to sales_summaries...');
        try {
            await db.query(`
                ALTER TABLE sales_summaries
                ADD COLUMN pre_draw_cash_in_amount DECIMAL(15,2) DEFAULT 0,
                ADD COLUMN post_draw_cash_in_amount DECIMAL(15,2) DEFAULT 0,
                ADD COLUMN pre_draw_note TEXT NULL,
                ADD COLUMN post_draw_note TEXT NULL,
                ADD COLUMN cutoff_time TIME DEFAULT '20:10:00';
            `);
            console.log('Columns added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist, skipping.');
            } else {
                throw err;
            }
        }

        // 2. Create closing_settlement_evidence table
        console.log('Creating closing_settlement_evidence table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS closing_settlement_evidence (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                summary_id INT NOT NULL,
                bucket ENUM('PRE_DRAW','POST_DRAW') NOT NULL,
                file_url TEXT NOT NULL,
                settle_xref VARCHAR(64) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (summary_id) REFERENCES sales_summaries(id) ON DELETE CASCADE
            );
        `);
        console.log('Table created successfully.');

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
