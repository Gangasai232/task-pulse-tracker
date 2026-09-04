const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');

/**
 * @desc    List all users
 * @route   GET /api/users
 * @access  Private (MANAGER, ADMIN)
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

/**
 * @desc    Register a new user account
 * @route   POST /api/users
 * @access  Private (ADMIN only)
 */
const createUser = async (req, res) => {
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
};

/**
 * @desc    Delete user account & clean up task/project references
 * @route   DELETE /api/users/:id
 * @access  Private (ADMIN only)
 */
const deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    const userToDelete = await User.findById(targetUserId);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (userToDelete.role === 'ADMIN') {
      return res.status(400).json({ error: 'System Administrator accounts cannot be deleted.' });
    }

    await User.findByIdAndDelete(targetUserId);

    // Clean up memberships and task assignments for deleted user
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
};

/**
 * @desc    Reset user password
 * @route   PUT /api/users/:id/password
 * @access  Private (ADMIN only)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedPassword;
    await user.save();
    await User.findByIdAndUpdate(user._id, { $set: { password: newHashedPassword } }, { new: true });

    console.log(`[ADMIN] Reset password successfully for user ${user.email}`);

    return res.json({ message: `Password for ${user.email} updated successfully.` });
  } catch (err) {
    console.error('Reset user password error:', err);
    return res.status(500).json({ error: 'Failed to reset user password.' });
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  resetUserPassword,
};
