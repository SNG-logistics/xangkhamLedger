// FILE: src/routes/period.routes.js
const express = require('express');
const router = express.Router();
const periodController = require('../controllers/period.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// Basic Period CRUD
router.get('/', auth.requireAuth, periodController.list);
router.post('/toggle-backfill', auth.requireSuperAdmin, periodController.toggleBackfill);
router.post('/create', auth.requireSuperAdmin, periodController.create); // Alias for explicit checking
router.get('/:id', auth.requireAuth, periodController.detail);
router.post('/:id/lock', auth.requireSuperAdmin, periodController.lock); // Added missing lock route
router.post('/:id/unlock', auth.requireSuperAdmin, periodController.unlock);
router.post('/:id/balances', auth.requireAuth, rbac.canModifyPeriod, periodController.updateBalances);
router.post('/:id/incidents', auth.requireAuth, periodController.createIncident);
router.post('/:id/incidents/:incidentId/resolve', auth.requireSuperAdmin, periodController.resolveIncident);
router.delete('/:id', auth.requireSuperAdmin, periodController.delete);
router.post('/:id/reconcile', auth.requireAdmin, periodController.reconcileImage);
router.post('/:id/expenses/quick-add', auth.requireAdmin, rbac.canModifyPeriod, periodController.quickAddExpense);

module.exports = router;
