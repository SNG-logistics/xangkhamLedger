const mysql = require('mysql2/promise');

const credentials = [
    { user: 'root', password: '' },
    { user: 'root', password: 'root' },
    { user: 'root', password: 'password' },
    { user: 'root', password: '1234' },
    { user: 'root', password: '123456' },
    { user: 'root', password: 'admin' },
    { user: 'admin', password: 'admin123' },
    { user: 'admin', password: 'password' },
    { user: 'root', password: 'admin123' }
];

async function checkConnection() {
    console.log('🔍 Starting Database Credential Diagnostic...');

    for (const cred of credentials) {
        process.stdout.write(`Testing User: "${cred.user}", Password: "${cred.password}" ... `);

        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: cred.user,
                password: cred.password,
                port: 3306
            });

            console.log('✅ SUCCESS!');
            console.log('\n🎉 FOUND VALID CREDENTIALS:');
            console.log(`DB_USER=${cred.user}`);
            console.log(`DB_PASSWORD=${cred.password}`);
            console.log('\nPlease update these in your .env file.');

            await connection.end();
            process.exit(0);
        } catch (error) {
            console.log('❌ Failed');
            // console.log(`   Error: ${error.message}`);
        }
    }

    console.log('\n❌ None of the common credentials worked.');
    console.log('Please check your XAMPP/MySQL settings manually.');
    process.exit(1);
}

checkConnection();
