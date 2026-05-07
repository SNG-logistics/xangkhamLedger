// FILE: src/routes/cashflow.routes.js
const express = require('express');
const router = express.Router();
const cashflowController = require('../controllers/cashflow.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// List
router.get('/', auth.requireAuth, cashflowController.index);

// Actions
router.post('/', auth.requireAuth, rbac.canModifyPeriod, cashflowController.create);
router.delete('/:id', auth.requireAuth, cashflowController.delete); // Add rbac middleware if period_id can be resolved

module.exports = router;
