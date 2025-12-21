// FILE: src/routes/summary.routes.js
const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summary.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.get('/:periodId', auth.requireAuth, summaryController.showForm);
router.post('/save', auth.requireAuth, rbac.canModifyPeriod, summaryController.save);

module.exports = router;
