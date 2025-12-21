// FILE: src/routes/expense.routes.js
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.get('/', auth.requireAuth, expenseController.list);
router.post('/create', auth.requireAuth, rbac.canModifyPeriod, expenseController.create);
router.post('/update', auth.requireAuth, rbac.canModifyPeriod, expenseController.update);
router.delete('/:id', auth.requireAuth, rbac.canModifyPeriod, expenseController.delete);

module.exports = router;
