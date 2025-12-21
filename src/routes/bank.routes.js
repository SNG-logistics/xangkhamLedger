// FILE: src/routes/bank.routes.js
const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bank.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

router.get('/:periodId', auth.requireAuth, bankController.showForm);
router.post('/create', auth.requireAuth, rbac.canModifyPeriod, bankController.create);
router.post('/update', auth.requireAuth, rbac.canModifyPeriod, bankController.update);
router.delete('/:id', auth.requireAuth, rbac.canModifyPeriod, bankController.delete);

module.exports = router;
