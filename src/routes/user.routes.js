const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// Protect all routes
router.use(auth.requireAuth);

// Allow ADMIN, SUPER_ADMIN, and CEO (defined in auth.requireAdmin)
router.use(auth.requireAdmin);

router.get('/', userController.list);
router.post('/create', userController.create);
router.post('/:id/update', userController.update);
router.post('/:id/change-password', userController.changePassword);
router.delete('/:id', userController.delete); // Use DELETE method for API-like call from frontend JS

module.exports = router;
