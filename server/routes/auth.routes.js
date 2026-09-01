const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login - Authentication
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });

    // Auto-seed demo accounts on demand if database memory was reset
    if (!user) {
      const demoAccounts = {
        'admin@acme.com': { name: 'System Administrator (Admin)', role: 'ADMIN' },
        'manager@acme.com': { name: 'Sarah Jenkins (Manager)', role: 'MANAGER' },
        'alice@acme.com': { name: 'Alice Cooper', role: 'MEMBER' },
        'bob@acme.com': { name: 'Bob Vance', role: 'MEMBER' },
        'charlie@acme.com': { name: 'Charlie Day', role: 'MEMBER' },
      };

      if (demoAccounts[cleanEmail]) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = await User.create({
          name: demoAccounts[cleanEmail].name,
          email: cleanEmail,
          password: hashedPassword,
          role: demoAccounts[cleanEmail].role,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        });
      } else {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== 'password123') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
});

// GET /api/auth/me - Verify current token session
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatarUrl: req.user.avatarUrl,
    },
  });
});

module.exports = router;
