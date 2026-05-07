// FILE: src/middleware/auth.js
const auth = {
    requireAuth: (req, res, next) => {
        if (req.session && req.session.userId) {
            return next();
        }
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Unauthorized: Please login first' });
        }
        return res.redirect('/login');
    },

    requireSuperAdmin: (req, res, next) => {
        if (req.session && req.session.userId && req.session.role === 'SUPER_ADMIN') {
            return next();
        }
        return res.status(403).send('Forbidden: SUPER_ADMIN only');
    },

    isAuthenticated: (req, res, next) => {
        res.locals.isAuth = req.session && req.session.userId;
        res.locals.user = req.session ? {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role,
            fullName: req.session.fullName
        } : null;
        next();
    }
};

module.exports = auth;
