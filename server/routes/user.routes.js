const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getUsers,
  createUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/user.controller');

// GET /api/users - List all users (MANAGER and ADMIN only)
router.get('/', authMiddleware, requireRole('MANAGER'), getUsers);

// POST /api/users - Register new user account (ADMIN ONLY)
router.post('/', authMiddleware, requireRole('ADMIN'), createUser);

// DELETE /api/users/:id - Delete user account (ADMIN ONLY)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteUser);

// PUT /api/users/:id/password - Reset user password (ADMIN ONLY)
router.put('/:id/password', authMiddleware, requireRole('ADMIN'), resetUserPassword);

module.exports = router;
