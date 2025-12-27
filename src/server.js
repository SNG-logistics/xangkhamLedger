// FILE: src/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Make 'path' available to all views (for sidebar active state)
app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'changkhum-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth middleware (for views)
const auth = require('./middleware/auth');
app.use(auth.isAuthenticated);

// Layout middleware (simple approach for EJS)
app.use((req, res, next) => {
    const originalRender = res.render;
    res.render = function (view, options, callback) {
        options = options || {};
        options.title = options.title || 'XANGKHAM Ledger';

        if (view === 'login') {
            // Login page doesn't need layout
            return originalRender.call(this, view, options, callback);
        }

        // For other pages, wrap in layout
        const body = options.body || '';
        originalRender.call(this, view, options, (err, html) => {
            if (err) return callback ? callback(err) : next(err);

            options.body = html;
            originalRender.call(this, 'layout', options, callback);
        });
    };
    next();
});

// Routes
const authRoutes = require('./routes/auth.routes');
const periodRoutes = require('./routes/period.routes');
const summaryRoutes = require('./routes/summary.routes');
const expenseRoutes = require('./routes/expense.routes');
const bankRoutes = require('./routes/bank.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');

// Mount routes
app.use('/', authRoutes);
app.use('/periods', periodRoutes);
app.use('/summaries', summaryRoutes);
app.use('/expenses', expenseRoutes);
app.use('/banks', bankRoutes);
app.use('/reports', reportRoutes);
app.use('/reports', reportRoutes);
app.use('/audit', auditRoutes);
app.use('/settings/bank-accounts', require('./routes/bank_account.routes'));
app.use('/cashflow', require('./routes/cashflow.routes'));

// Dashboard
const Period = require('./models/period.model');
const money = require('./utils/money');
app.get('/dashboard', auth.requireAuth, async (req, res) => {
    try {
        const periods = await Period.findAll();

        const stats = {
            totalPeriods: periods.length,
            openPeriods: periods.filter(p => p.status === 'OPEN').length,
            lockedPeriods: periods.filter(p => p.status === 'LOCKED').length
        };

        const recentPeriods = periods.slice(0, 10);

        res.render('dashboard', {
            title: 'Dashboard',
            stats,
            recentPeriods,
            money
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading dashboard');
    }
});

// Root redirect
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   XANGKHAM Ledger - Server Started!       ║
╠═══════════════════════════════════════════╣
║   Port: ${PORT}                           ║
║   URL: http://localhost:${PORT}           ║
║                                           ║
║   Default Login:                          ║
║   Username: admin                         ║
║   Password: admin123                      ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
