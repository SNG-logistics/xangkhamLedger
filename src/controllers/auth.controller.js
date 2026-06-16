// FILE: src/controllers/auth.controller.js
const User = require('../models/user.model');
const audit = require('../middleware/audit');

const authController = {
    showLogin: (req, res) => {
        if (req.session && req.session.userId) {
            return res.redirect('/dashboard');
        }
        res.render('login', { error: null });
    },

    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            const user = await User.findByUsername(username);
            if (!user) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            const isValid = await User.verifyPassword(password, user.password_hash);
            if (!isValid) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.fullName = user.full_name;

            await audit.log(user.id, 'LOGIN', 'users', user.id, null, null, null, req.ip, req.get('User-Agent'));

            const redirectTo = req.session.redirectTo || '/dashboard';
            delete req.session.redirectTo;
            res.redirect(redirectTo);
        } catch (error) {
            console.error('Login error:', error);
            res.render('login', { error: 'An error occurred' });
        }
    },

    logout: async (req, res) => {
        const userId = req.session?.userId;
        if (userId) {
            await audit.log(userId, 'LOGOUT', 'users', userId, null, null, null, req.ip, req.get('User-Agent'));
        }
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = authController;
