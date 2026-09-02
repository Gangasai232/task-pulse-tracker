const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/projects - List accessible projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { includeArchived } = req.query;
    let query = {};

    if (req.user.role !== 'MANAGER') {
      query.members = req.user._id;
    }

    if (includeArchived !== 'true') {
      query.archived = false;
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ updatedAt: -1 });

    return res.json(projects);
  } catch (err) {
    console.error('Fetch projects error:', err);
    return res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /api/projects - Create project (MANAGER only)
router.post('/', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const { key, name, description, owner, members } = req.body;

    if (!key || !name) {
      return res.status(400).json({ error: 'Project key and name are required.' });
    }

    // Check key uniqueness
    const existingKey = await Project.findOne({ key: key.toUpperCase().trim() });
    if (existingKey) {
      return res.status(400).json({ error: `Project key '${key.toUpperCase()}' already exists.` });
    }

    const projectOwner = owner || req.user._id;
    let memberIds = members && Array.isArray(members) ? members : [];
    // Ensure owner is included in members list
    if (!memberIds.includes(projectOwner.toString())) {
      memberIds.push(projectOwner);
    }

    const project = new Project({
      key: key.toUpperCase().trim(),
      name: name.trim(),
      description: description || '',
      owner: projectOwner,
      members: memberIds,
    });

    await project.save();
    const populated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    return res.status(201).json(populated);
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'Failed to create project.' });
  }
});

// GET /api/projects/:id - Get single project details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Members can only see projects they belong to
    if (
      req.user.role !== 'MANAGER' &&
      !project.members.some((m) => m._id.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ error: 'Access denied to this project.' });
    }

    return res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// PUT /api/projects/:id - Edit project & members (MANAGER only)
router.put('/:id', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const { name, description, owner, members } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const oldMembers = project.members.map((id) => id.toString());
    let newMembers = members && Array.isArray(members) ? members.map((id) => id.toString()) : oldMembers;

    if (owner && !newMembers.includes(owner.toString())) {
      newMembers.push(owner.toString());
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (owner) project.owner = owner;
    project.members = newMembers;

    await project.save();

    // Requirement 5: Removing someone from a project unassigns them from that project's tasks.
    const removedMemberIds = oldMembers.filter((mId) => !newMembers.includes(mId));
    if (removedMemberIds.length > 0) {
      const affectedTasks = await Task.find({
        project: project._id,
        assignees: { $in: removedMemberIds },
      });

      for (const task of affectedTasks) {
        task.assignees = task.assignees.filter((aId) => !removedMemberIds.includes(aId.toString()));
        await task.save();

        await ActivityLog.create({
          task: task._id,
          actor: req.user._id,
          type: 'ASSIGNMENT_CHANGE',
          details: {
            reason: 'Member removed from project',
            removedUserIds: removedMemberIds,
          },
        });
      }
    }

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    return res.json(updated);
  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ error: 'Failed to update project.' });
  }
});

// PATCH /api/projects/:id/archive - Archive / Restore project (MANAGER only)
router.patch('/:id/archive', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const { archived } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    project.archived = Boolean(archived);
    await project.save();

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    return res.json(updated);
  } catch (err) {
    console.error('Archive project error:', err);
    return res.status(500).json({ error: 'Failed to archive/restore project.' });
  }
});

// DELETE /api/projects/:id - Delete project & cascade tasks (MANAGER/ADMIN only)
router.delete('/:id', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Cascade delete all tasks belonging to this project
    const projectTasks = await Task.find({ project: project._id }).select('_id');
    const taskIds = projectTasks.map((t) => t._id);

    await Task.deleteMany({ project: project._id });

    if (taskIds.length > 0) {
      await ActivityLog.deleteMany({ task: { $in: taskIds } });
      const AlertDismissal = require('../models/AlertDismissal');
      await AlertDismissal.deleteMany({ task: { $in: taskIds } });
    }

    await Project.findByIdAndDelete(project._id);

    return res.json({ message: `Project '${project.name}' deleted successfully.`, projectId: project._id });
  } catch (err) {
    console.error('Delete project error:', err);
    return res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
