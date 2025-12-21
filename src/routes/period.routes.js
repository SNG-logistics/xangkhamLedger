// FILE: src/routes/period.routes.js
const express = require('express');
const router = express.Router();
const periodController = require('../controllers/period.controller');
const auth = require('../middleware/auth');

router.get('/', auth.requireAuth, periodController.list);
router.get('/:id', auth.requireAuth, periodController.detail);
router.post('/create', auth.requireSuperAdmin, periodController.create);
router.post('/:id/lock', auth.requireSuperAdmin, periodController.lock);
router.post('/:id/unlock', auth.requireSuperAdmin, periodController.unlock);

module.exports = router;
