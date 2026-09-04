const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  archiveProject,
  deleteProject,
} = require('../controllers/project.controller');

// GET /api/projects - List accessible projects
router.get('/', authMiddleware, getProjects);

// POST /api/projects - Create project (MANAGER only)
router.post('/', authMiddleware, requireRole('MANAGER'), createProject);

// GET /api/projects/:id - Get single project details
router.get('/:id', authMiddleware, getProject);

// PUT /api/projects/:id - Edit project & members (MANAGER/ADMIN only)
router.put('/:id', authMiddleware, requireRole('MANAGER'), updateProject);

// PATCH /api/projects/:id/archive - Archive / Restore project (MANAGER/ADMIN only)
router.patch('/:id/archive', authMiddleware, requireRole('MANAGER'), archiveProject);

// DELETE /api/projects/:id - Delete project & cascade tasks (MANAGER/ADMIN only)
router.delete('/:id', authMiddleware, requireRole('MANAGER'), deleteProject);

module.exports = router;
