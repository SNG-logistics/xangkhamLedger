// FILE: src/routes/bank_account.routes.js
const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bank_account.controller');
const auth = require('../middleware/auth');

// List (HTML page or JSON)
router.get('/', auth.requireAuth, bankAccountController.list);

// Actions (SUPER_ADMIN only)
router.post('/', auth.requireSuperAdmin, bankAccountController.create);
router.put('/:id', auth.requireSuperAdmin, bankAccountController.update);
router.delete('/:id', auth.requireSuperAdmin, bankAccountController.delete);

module.exports = router;
