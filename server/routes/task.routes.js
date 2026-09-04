const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  bulkAction,
} = require('../controllers/task.controller');

// GET /api/tasks - Server-side list, search, filter, sort, paginate
router.get('/', authMiddleware, getTasks);

// POST /api/tasks - Create a new task
router.post('/', authMiddleware, createTask);

// POST /api/tasks/bulk - Bulk action runner
router.post('/bulk', authMiddleware, bulkAction);

// GET /api/tasks/:id - Task details with timeline history & comments
router.get('/:id', authMiddleware, getTask);

// PUT /api/tasks/:id - Update task details & state machine transition
router.put('/:id', authMiddleware, updateTask);

// DELETE /api/tasks/:id - Delete task (MANAGER only)
router.delete('/:id', authMiddleware, requireRole('MANAGER'), deleteTask);

// POST /api/tasks/:id/comments - Add immutable comment
router.post('/:id/comments', authMiddleware, addComment);

module.exports = router;
