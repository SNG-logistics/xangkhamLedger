// FILE: src/routes/audit.routes.js
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const auth = require('../middleware/auth');

router.get('/logs', auth.requireSuperAdmin, auditController.logs);

module.exports = router;
