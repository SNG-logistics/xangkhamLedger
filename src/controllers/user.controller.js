const User = require('../models/user.model');
const audit = require('../utils/audit');

const userController = {
    list: async (req, res) => {
        try {
            const users = await User.findAll();
            // Pass req.session.role to view for potential conditional rendering
            const currentUserRole = req.session.role;
            const currentUserId = req.session.userId;
            const currentFullName = req.session.fullName || req.session.username; // Fallback

            res.render('users/list', {
                users,
                currentUserRole,
                currentUserId,
                user: { role: currentUserRole, fullName: currentFullName } // Fix layout error
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error listing users');
        }
    },

    create: async (req, res) => {
        try {
            const { username, password, full_name, role } = req.body;

            // Simple validation
            if (!username || !password || !full_name) {
                return res.status(400).send('Missing required fields');
            }

            const existing = await User.findByUsername(username);
            if (existing) {
                return res.send(`<script>alert('ชื่อผู้ใช้ (Username) นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น'); window.location.href='/users';</script>`);
            }

            const userId = await User.create(username, password, full_name, role);

            await audit.log(
                req.session.userId,
                'CREATE_USER',
                'users',
                userId,
                null,
                { username, full_name, role },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/users');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating user');
        }
    },

    update: async (req, res) => {
        try {
            const id = req.params.id;
            const { full_name, role, is_active } = req.body;

            const existing = await User.findById(id);
            if (!existing) {
                return res.status(404).send('User not found');
            }

            const isActive = is_active === 'on' || is_active === true || is_active === 'true' ? 1 : 0;

            await User.update(id, full_name, role, isActive);

            await audit.log(
                req.session.userId,
                'UPDATE_USER',
                'users',
                id,
                existing,
                { full_name, role, isActive },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/users');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error updating user');
        }
    },

    delete: async (req, res) => {
        try {
            const id = req.params.id;

            // Prevent self-deletion
            if (parseInt(id) === req.session.userId) {
                return res.status(400).send('Cannot delete yourself');
            }

            const existing = await User.findById(id);
            if (!existing) return res.status(404).send('User not found');

            await User.delete(id);

            await audit.log(
                req.session.userId,
                'DELETE_USER',
                'users',
                id,
                existing,
                null,
                'Deleted by admin',
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting user' });
        }
    },

    changePassword: async (req, res) => {
        try {
            const id = req.params.id;
            const { new_password } = req.body;

            if (!new_password || new_password.length < 4) {
                return res.status(400).send('Password too short');
            }

            await User.changePassword(id, new_password);

            await audit.log(
                req.session.userId,
                'CHANGE_PASSWORD_USER',
                'users',
                id,
                null,
                null,
                'Password changed by admin',
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/users');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error changing password');
        }
    }
};

module.exports = userController;
