const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/users - List all users (MANAGER and ADMIN only)
router.get('/', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// POST /api/users - Register new user account (ADMIN ONLY)
router.post('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, avatarUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: `Account with email '${cleanEmail}' already exists.` });
    }

    const allowedRole = ['ADMIN', 'MANAGER', 'MEMBER'].includes(role) ? role : 'MEMBER';
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: allowedRole,
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    });

    return res.status(201).json(newUser);
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// DELETE /api/users/:id - Delete user account (ADMIN ONLY)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
    }

    const userToDelete = await User.findById(targetUserId);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    await User.findByIdAndDelete(targetUserId);

    // Clean up memberships and task assignments for deleted user
    const Task = require('../models/Task');
    const Project = require('../models/Project');

    await Task.updateMany(
      { assignees: targetUserId },
      { $pull: { assignees: targetUserId } }
    );

    await Project.updateMany(
      { members: targetUserId },
      { $pull: { members: targetUserId } }
    );

    return res.json({ message: `Account '${userToDelete.email}' deleted successfully.`, userId: targetUserId });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Failed to delete user account.' });
  }
});

module.exports = router;
