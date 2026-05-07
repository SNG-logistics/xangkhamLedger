// FILE: src/routes/audit.routes.js
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const auth = require('../middleware/auth');

// Fix: Add root route mapping to logs
router.get('/', auth.requireAdmin, auditController.logs);
router.get('/logs', auth.requireAdmin, auditController.logs);
router.get('/check', auth.requireAdmin, auditController.check);

module.exports = router;
