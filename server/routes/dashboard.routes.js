const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getStats,
  getAlerts,
  dismissAlert,
} = require('../controllers/dashboard.controller');

// GET /api/dashboard/stats - Overview metrics, status breakdown, assignee breakdown, 8-week completions
router.get('/stats', authMiddleware, getStats);

// GET /api/dashboard/alerts - Active overdue alerts for current user
router.get('/alerts', authMiddleware, getAlerts);

// POST /api/dashboard/alerts/dismiss - Dismiss overdue alert for a task
router.post('/alerts/dismiss', authMiddleware, dismissAlert);

module.exports = router;
