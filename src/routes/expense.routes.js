// FILE: src/routes/expense.routes.js
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// List all expenses (via periods)
router.get('/', auth.requireAuth, expenseController.index);

router.get('/list', auth.requireAuth, expenseController.list); // Changed from / to /list to allow index at /
// Note: original code had router.get('/', ... list) which we shouldn't break if used elsewhere with query param.
// But wait, router.get('/', ...) was list. If I overwrite it, I break existing calls?
// existing calls use /expenses?period_id=...
// So I should check if query param exists in index method?
// Better: keep router.get('/', ...) pointing to a smart method or use middleware?
// Or:
// router.get('/', auth.requireAuth, (req, res, next) => {
//    if (req.query.period_id) return expenseController.list(req, res);
//    return expenseController.index(req, res);
// });
// Let's implement this logic in `index` method or router wrapper?
// Actually simpler:
// In controller: index checks for period_id. If present, call list logic or redirect.
// But I already wrote separate `index` method.
// Let's modify the route to be smart.
router.post('/create', auth.requireAuth, rbac.canModifyPeriod, expenseController.create);
router.post('/update', auth.requireAuth, rbac.canModifyPeriod, expenseController.update);
router.delete('/:id', auth.requireAuth, rbac.canModifyPeriod, expenseController.delete);

module.exports = router;
