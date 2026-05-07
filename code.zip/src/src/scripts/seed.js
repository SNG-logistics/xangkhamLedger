const db = require('../config/db');
const User = require('../models/user.model');

async function seed() {
    try {
        console.log('Starting seed process...');

        const username = 'admin';
        const password = 'admin123';
        const fullName = 'Super Admin';

        // Check if user exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            console.log('User already exists. Skipping...');
        } else {
            console.log('Creating SUPER_ADMIN user...');
            await User.create(username, password, fullName, 'SUPER_ADMIN');
            console.log('SUPER_ADMIN user created successfully.');
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
        }

        console.log('Seed process completed.');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
