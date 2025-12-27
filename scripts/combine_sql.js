const fs = require('fs');
const path = require('path');

const sqlDir = path.join(__dirname, '../sql');
const outputFile = path.join(__dirname, '../sql/full_database_setup.sql');

const files = fs.readdirSync(sqlDir)
    .filter(file => file.endsWith('.sql') && file !== 'full_database_setup.sql')
    .sort(); // Ensure 001, 002, ... order

let fullSql = `-- XANGKHAM Ledger - Full Database Setup Script\n`;
fullSql += `-- Generated at: ${new Date().toISOString()}\n\n`;

files.forEach(file => {
    console.log(`Processing ${file}...`);
    const content = fs.readFileSync(path.join(sqlDir, file), 'utf8');
    fullSql += `-- START OF ${file} --\n`;
    fullSql += content + '\n';
    fullSql += `-- END OF ${file} --\n\n`;
});

fs.writeFileSync(outputFile, fullSql);
console.log(`\nSuccessfully created ${outputFile}`);
console.log(`Total files combined: ${files.length}`);
