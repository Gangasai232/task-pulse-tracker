const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { login, getMe, changePassword } = require('../controllers/auth.controller');

// POST /api/auth/login - Authentication
router.post('/login', login);

// GET /api/auth/me - Verify current token session
router.get('/me', authMiddleware, getMe);

// PUT /api/auth/change-password - Change current user password
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;
