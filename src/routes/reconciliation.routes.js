const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliation.controller');
const auth = require('../middleware/auth');

// Make sure user is authenticated and is ADMIN or SUPER_ADMIN
router.use(auth.requireAuth);
router.use(auth.requireAdmin);

router.get('/', reconciliationController.index);
router.post('/process', reconciliationController.processImage);

module.exports = router;
