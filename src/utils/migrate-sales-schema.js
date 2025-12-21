require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateSalesSchema() {
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

        const columnsToAdd = [
            'sales_6_digit DECIMAL(15,2) DEFAULT 0', 'prize_6_digit DECIMAL(15,2) DEFAULT 0',
            'sales_5_digit DECIMAL(15,2) DEFAULT 0', 'prize_5_digit DECIMAL(15,2) DEFAULT 0',
            'sales_4_digit DECIMAL(15,2) DEFAULT 0', 'prize_4_digit DECIMAL(15,2) DEFAULT 0',
            'sales_3_digit DECIMAL(15,2) DEFAULT 0', 'prize_3_digit DECIMAL(15,2) DEFAULT 0',
            'sales_2_digit DECIMAL(15,2) DEFAULT 0', 'prize_2_digit DECIMAL(15,2) DEFAULT 0',
            'sales_1_digit DECIMAL(15,2) DEFAULT 0', 'prize_1_digit DECIMAL(15,2) DEFAULT 0'
        ];

        for (const colDef of columnsToAdd) {
            try {
                // Check if column exists first to avoid error on multiple runs
                // Actually, simpler to just try ADD COLUMN and catch "Duplicate column name" error
                // But let's do it clean.
                const colName = colDef.split(' ')[0];
                const query = `ALTER TABLE sales_summaries ADD COLUMN ${colDef}`;
                console.log(`Executing: ${query}`);
                await connection.query(query);
                console.log(`✅ Added column ${colName}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`⚠️  Column already exists (skipping): ${colDef.split(' ')[0]}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('🎉 Migration completed successfully!');
        await connection.end();

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrateSalesSchema();
