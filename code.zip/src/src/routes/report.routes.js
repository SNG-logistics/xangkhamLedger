// FILE: src/routes/report.routes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const auth = require('../middleware/auth');

router.get('/period/:periodId', auth.requireAuth, reportController.periodReport);
router.get('/monthly', auth.requireAuth, reportController.monthlyReport);

module.exports = router;
