const mysql = require('mysql2/promise');
async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Rh4kbuko',
    database: 'changkhum_ledger', // or xangkham
    port: 3306
  });
  const [rows] = await connection.execute('SELECT username, role FROM users');
  console.log(rows);
  await connection.end();
}
test().catch(e => {
  console.log("changkhum_ledger failed, trying xangkham...");
  mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Rh4kbuko',
    database: 'xangkham',
    port: 3306
  }).then(async (conn) => {
    const [rows] = await conn.execute('SELECT username, role FROM users');
    console.log("From xangkham DB:", rows);
    await conn.end();
  });
});
