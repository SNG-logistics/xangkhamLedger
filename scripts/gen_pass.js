const bcrypt = require('bcrypt');

const newPassword = 'Rh4kbuko2531.';

bcrypt.hash(newPassword, 10, function (err, hash) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('\n--- Use this SQL to update your password ---');
    console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
    console.log('--- End of SQL ---\n');
});
