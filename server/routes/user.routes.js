const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users - List all users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ name: 1 });
    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;
