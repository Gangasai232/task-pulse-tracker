const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    List accessible projects
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = async (req, res) => {
  try {
    const { includeArchived, archivedOnly } = req.query;
    let query = {};

    if (req.user.role === 'MANAGER') {
      query.$or = [{ owner: req.user._id }, { members: req.user._id }];
    } else if (req.user.role === 'MEMBER') {
      query.members = req.user._id;
    }
    // ADMIN sees all projects by default

    if (archivedOnly === 'true') {
      query.archived = true;
    } else if (includeArchived !== 'true') {
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
};

/**
 * @desc    Create project
 * @route   POST /api/projects
 * @access  Private (MANAGER, ADMIN)
 */
const createProject = async (req, res) => {
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
};

/**
 * @desc    Get single project details
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Only Admin or users allocated to this project (owner or member) can view it
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = project.owner && project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some((m) => m._id.toString() === req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this project.' });
    }

    return res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    return res.status(500).json({ error: 'Failed to fetch project.' });
  }
};

/**
 * @desc    Edit project & members
 * @route   PUT /api/projects/:id
 * @access  Private (MANAGER, ADMIN)
 */
const updateProject = async (req, res) => {
  try {
    const { name, description, owner, members } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Only Admin or project owner/member managers can modify project
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = project.owner && project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({ error: 'Permission denied. You are not assigned to this project.' });
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

    // Unassign removed project members from project's tasks
    const removedMemberIds = oldMembers.filter((mId) => !newMembers.includes(mId));
    if (removedMemberIds.length > 0) {
      const affectedTasks = await Task.find({
        project: project._id,
        assignees: { $in: removedMemberIds },
      });

      for (const task of affectedTasks) {
        const unassignedFromThisTask = task.assignees.filter((aId) =>
          removedMemberIds.includes(aId.toString())
        );

        task.assignees = task.assignees.filter((aId) => !removedMemberIds.includes(aId.toString()));
        await task.save();

        for (const uId of unassignedFromThisTask) {
          await ActivityLog.create({
            task: task._id,
            actor: req.user._id,
            type: 'UNASSIGNED',
            targetUser: uId,
            details: {
              userId: uId.toString(),
              reason: 'Member removed from project',
            },
          });
        }
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
};

/**
 * @desc    Archive / Restore project
 * @route   PATCH /api/projects/:id/archive
 * @access  Private (MANAGER, ADMIN)
 */
const archiveProject = async (req, res) => {
  try {
    const { archived } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Only Admin or allocated project manager can archive/restore
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = project.owner && project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({ error: 'Permission denied. You are not assigned to this project.' });
    }

    const isArchived = Boolean(archived);
    await Project.findByIdAndUpdate(project._id, { $set: { archived: isArchived } }, { new: true });

    const updated = await Project.findById(project._id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    return res.json(updated);
  } catch (err) {
    console.error('Archive project error:', err);
    return res.status(500).json({ error: 'Failed to archive/restore project.' });
  }
};

/**
 * @desc    Delete project & cascade tasks
 * @route   DELETE /api/projects/:id
 * @access  Private (MANAGER, ADMIN)
 */
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Only Admin or allocated project owner/member manager can delete project
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = project.owner && project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({ error: 'Permission denied. You are not assigned to this project.' });
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
};

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  archiveProject,
  deleteProject,
};
