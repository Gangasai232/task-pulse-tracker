const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key-task-tracker-2026';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No session token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = null;
    if (decoded.id) {
      user = await User.findById(decoded.id);
    }

    // Resilient fallback: if server/database restarted and generated fresh user ObjectIds, match by email
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(401).json({ error: 'User account not found or token is invalid. Please sign in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired or the token is invalid. Please sign in again.' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // Admin has superuser privileges across manager roles
    if (req.user.role === 'ADMIN') {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Access requires role: ${allowedRoles.join(' or ')}. Your role is ${req.user.role}.`,
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  JWT_SECRET,
};
