const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  STATUSES,
  validateStatusTransition,
  checkUnfinishedBlockingTasks,
  getLegalTransitions,
} = require('../utils/stateMachine');

// GET /api/tasks - Server-side list, search, filter, sort, paginate
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      projectId,
      search,
      status,
      assigneeId,
      priority,
      isOverdue,
      myTasksOnly,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Determine accessible projects for non-managers
    let accessibleProjectIds = [];
    if (req.user.role !== 'MANAGER') {
      const userProjects = await Project.find({ members: req.user._id, archived: false }).select('_id');
      accessibleProjectIds = userProjects.map((p) => p._id);
    } else {
      // Managers can see all non-archived projects by default unless specific projectId specified
      const activeProjects = await Project.find({ archived: false }).select('_id');
      accessibleProjectIds = activeProjects.map((p) => p._id);
    }

    const filter = { project: { $in: accessibleProjectIds } };

    if (projectId) {
      if (req.user.role !== 'MANAGER') {
        const isAccessible = accessibleProjectIds.some(
          (pId) => pId.toString() === projectId.toString()
        );
        if (!isAccessible) {
          return res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
        }
      }
      filter.project = projectId;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (req.user.role !== 'MANAGER') {
      // Non-manager members only see tasks assigned to themselves
      filter.assignees = req.user._id;
    } else if (assigneeId) {
      // Managers can filter by specific assignee
      filter.assignees = assigneeId;
    }

    if (isOverdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: STATUSES.DONE };
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }

    // Sort order setup
    const sortFieldMap = {
      dueDate: 'dueDate',
      priority: 'priority',
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      title: 'title',
    };
    const sortField = sortFieldMap[sortBy] || 'updatedAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const totalMatches = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate('project', 'key name archived')
      .populate('assignees', 'name email avatarUrl role')
      .populate('blockingTasks', 'title status taskNum project')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limitNum);

    // Attach legal transitions to each task for UI rendering
    const formattedTasks = tasks.map((t) => {
      const taskObj = t.toObject();
      taskObj.legalTransitions = getLegalTransitions(t.status, t.previousStatus);
      return taskObj;
    });

    return res.json({
      tasks: formattedTasks,
      total: totalMatches,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalMatches / limitNum),
    });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// POST /api/tasks - Create a new task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { project: projectId, title, description, priority, dueDate, assignees, blockingTasks } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project and task title are required.' });
    }

    // Validate due date is not in the past
    if (dueDate) {
      const selectedDate = new Date(dueDate);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (selectedDate < startOfToday) {
        return res.status(400).json({ error: 'Due date cannot be set to a past date. Please choose today or a future date.' });
      }
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Access check: Only project members or managers can create tasks
    if (
      req.user.role !== 'MANAGER' &&
      !project.members.some((m) => m.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    // Validate assignees are members of project
    let validAssignees = [];
    if (assignees && Array.isArray(assignees)) {
      const projectMemberIds = project.members.map((m) => m.toString());
      validAssignees = assignees.filter((aId) => projectMemberIds.includes(aId.toString()));
    }

    // Calculate next auto-increment taskNum for project
    const maxTask = await Task.findOne({ project: projectId }).sort({ taskNum: -1 }).select('taskNum');
    const nextTaskNum = maxTask ? maxTask.taskNum + 1 : 1;

    const task = new Task({
      project: projectId,
      taskNum: nextTaskNum,
      title: title.trim(),
      description: description || '',
      priority: priority || 'MEDIUM',
      status: STATUSES.BACKLOG,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignees: validAssignees,
      blockingTasks: blockingTasks && Array.isArray(blockingTasks) ? blockingTasks : [],
    });

    await task.save();

    // Record timeline entry
    await ActivityLog.create({
      task: task._id,
      actor: req.user._id,
      type: 'CREATED',
      details: { title: task.title, priority: task.priority },
    });

    const populated = await Task.findById(task._id)
      .populate('project', 'key name')
      .populate('assignees', 'name email avatarUrl role')
      .populate('blockingTasks', 'title status taskNum project');

    const resultObj = populated.toObject();
    resultObj.legalTransitions = getLegalTransitions(resultObj.status, resultObj.previousStatus);

    return res.status(201).json(resultObj);
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// GET /api/tasks/:id - Task details with timeline history & comments
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'key name members archived owner')
      .populate('assignees', 'name email avatarUrl role')
      .populate({
        path: 'blockingTasks',
        select: 'title status taskNum priority project',
        populate: { path: 'project', select: 'key' },
      });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Fetch immutable activity log / timeline for this task
    const timeline = await ActivityLog.find({ task: task._id })
      .populate('actor', 'name email avatarUrl role')
      .sort({ createdAt: 1 });

    const taskObj = task.toObject();
    taskObj.legalTransitions = getLegalTransitions(task.status, task.previousStatus);
    taskObj.timeline = timeline;

    return res.json(taskObj);
  } catch (err) {
    console.error('Get task details error:', err);
    return res.status(500).json({ error: 'Failed to fetch task details.' });
  }
});

// PUT /api/tasks/:id - Update task details & state machine transition
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, assignees, blockingTasks } = req.body;
    const task = await Task.findById(req.params.id).populate('project');

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const isAssignee = task.assignees.some((id) => id.toString() === req.user._id.toString());
    const isManagerOrAdmin = req.user.role === 'MANAGER' || req.user.role === 'ADMIN';

    if (!isManagerOrAdmin && !isAssignee) {
      return res.status(403).json({ error: 'Permission denied. Only assigned staff members, managers, or admins can update this task.' });
    }

    const isEditingDetails = title !== undefined || description !== undefined || priority !== undefined || dueDate !== undefined || assignees !== undefined || blockingTasks !== undefined;
    if (isEditingDetails && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'Permission denied. Only Managers and Admins can edit task details (title, description, priority, due date, assignees, and dependencies).' });
    }

    // Safely extract project member IDs
    const projectMemberIds = task.project && task.project.members
      ? task.project.members.map((m) => m.toString())
      : [];

    const logsToCreate = [];

    // State machine check if status changed
    if (status && status !== task.status) {
      // 1. Check legal transitions
      const transitionValidation = validateStatusTransition(task.status, status, task.previousStatus);
      if (!transitionValidation.valid) {
        return res.status(400).json({ error: transitionValidation.reason });
      }

      // 2. If moving to DONE, check unfinished blocking tasks
      if (status === STATUSES.DONE) {
        const blockingCheck = await checkUnfinishedBlockingTasks(task);
        if (blockingCheck.hasUnfinished) {
          return res.status(400).json({ error: blockingCheck.reason });
        }
      }

      // 3. Store or clear previousStatus logic for BLOCKED
      const oldStatus = task.status;
      if (status === STATUSES.BLOCKED) {
        task.previousStatus = oldStatus;
      } else if (oldStatus === STATUSES.BLOCKED) {
        task.previousStatus = null;
      }

      task.status = status;

      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'STATUS_CHANGE',
        details: { oldVal: oldStatus, newVal: status },
      });
    }

    // Assignee updates
    if (assignees !== undefined && Array.isArray(assignees)) {
      let validAssignees = assignees;
      if (projectMemberIds.length > 0) {
        validAssignees = assignees.filter((aId) => projectMemberIds.includes(aId.toString()));
      }

      const oldAssigneesStr = task.assignees.map((id) => id.toString()).sort().join(',');
      const newAssigneesStr = validAssignees.map((id) => id.toString()).sort().join(',');

      if (oldAssigneesStr !== newAssigneesStr) {
        task.assignees = validAssignees;
        logsToCreate.push({
          task: task._id,
          actor: req.user._id,
          type: 'ASSIGNMENT_CHANGE',
          details: { oldVal: task.assignees, newVal: validAssignees },
        });
      }
    }

    // Other field updates
    if (title && title.trim() !== task.title) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_UPDATE',
        details: { field: 'title', oldVal: task.title, newVal: title.trim() },
      });
      task.title = title.trim();
    }

    if (description !== undefined && description !== task.description) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_UPDATE',
        details: { field: 'description', oldVal: task.description, newVal: description },
      });
      task.description = description;
    }

    if (priority && priority !== task.priority) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_UPDATE',
        details: { field: 'priority', oldVal: task.priority, newVal: priority },
      });
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      if (dueDate) {
        const selectedDate = new Date(dueDate);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (selectedDate < startOfToday) {
          return res.status(400).json({ error: 'Due date cannot be set to a past date. Please choose today or a future date.' });
        }
      }

      const newDate = dueDate ? new Date(dueDate).toISOString() : null;
      const oldDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;
      if (newDate !== oldDate) {
        logsToCreate.push({
          task: task._id,
          actor: req.user._id,
          type: 'FIELD_UPDATE',
          details: { field: 'dueDate', oldVal: oldDate, newVal: newDate },
        });
        task.dueDate = dueDate ? new Date(dueDate) : null;
      }
    }

    if (blockingTasks && Array.isArray(blockingTasks)) {
      task.blockingTasks = blockingTasks;
    }

    await task.save();

    if (logsToCreate.length > 0) {
      await ActivityLog.insertMany(logsToCreate);
    }

    const updatedTask = await Task.findById(task._id)
      .populate('project', 'key name')
      .populate('assignees', 'name email avatarUrl role')
      .populate('blockingTasks', 'title status taskNum project');

    const taskObj = updatedTask.toObject();
    taskObj.legalTransitions = getLegalTransitions(updatedTask.status, updatedTask.previousStatus);

    return res.json(taskObj);
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Failed to update task: ' + err.message });
  }
});

// DELETE /api/tasks/:id - Delete task (MANAGER only)
router.delete('/:id', authMiddleware, requireRole('MANAGER'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Clean up associated activity logs and blocking references
    await ActivityLog.deleteMany({ task: req.params.id });
    await Task.updateMany(
      { blockingTasks: req.params.id },
      { $pull: { blockingTasks: req.params.id } }
    );

    return res.json({ message: 'Task deleted successfully.', taskId: req.params.id });
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// POST /api/tasks/:id/comments - Add immutable comment (Requirement 9)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const task = await Task.findById(req.params.id).populate('project');
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const log = await ActivityLog.create({
      task: task._id,
      actor: req.user._id,
      type: 'COMMENT',
      comment: comment.trim(),
    });

    const populatedLog = await ActivityLog.findById(log._id).populate('actor', 'name email avatarUrl role');

    return res.status(201).json(populatedLog);
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// POST /api/tasks/bulk - Bulk action runner (Requirement 7)
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { taskIds, action, payload } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Array of taskIds is required.' });
    }

    if (!['UPDATE_STATUS', 'UPDATE_ASSIGNEES', 'UPDATE_DUE_DATE'].includes(action)) {
      return res.status(400).json({ error: 'Invalid bulk action type.' });
    }

    const results = [];

    for (const id of taskIds) {
      try {
        const task = await Task.findById(id).populate('project');
        if (!task) {
          results.push({ taskId: id, success: false, error: 'Task not found.' });
          continue;
        }

        // Access check
        const projectMemberIds = task.project.members.map((m) => m.toString());
        if (req.user.role !== 'MANAGER' && !projectMemberIds.includes(req.user._id.toString())) {
          results.push({ taskId: id, success: false, error: 'Access denied to task project.' });
          continue;
        }

        if (action === 'UPDATE_STATUS') {
          const { targetStatus } = payload;
          const transitionValidation = validateStatusTransition(task.status, targetStatus, task.previousStatus);
          if (!transitionValidation.valid) {
            results.push({ taskId: id, success: false, error: transitionValidation.reason });
            continue;
          }

          if (targetStatus === STATUSES.DONE) {
            const blockingCheck = await checkUnfinishedBlockingTasks(task);
            if (blockingCheck.hasUnfinished) {
              results.push({ taskId: id, success: false, error: blockingCheck.reason });
              continue;
            }
          }

          const oldStatus = task.status;
          if (targetStatus === STATUSES.BLOCKED) {
            task.previousStatus = oldStatus;
          } else if (oldStatus === STATUSES.BLOCKED) {
            task.previousStatus = null;
          }

          task.status = targetStatus;
          await task.save();

          await ActivityLog.create({
            task: task._id,
            actor: req.user._id,
            type: 'STATUS_CHANGE',
            details: { oldVal: oldStatus, newVal: targetStatus, bulk: true },
          });

          results.push({ taskId: id, success: true });
        } else if (action === 'UPDATE_ASSIGNEES') {
          const { assignees } = payload;
          const validAssignees = (assignees || []).filter((aId) => projectMemberIds.includes(aId.toString()));
          task.assignees = validAssignees;
          await task.save();

          await ActivityLog.create({
            task: task._id,
            actor: req.user._id,
            type: 'ASSIGNMENT_CHANGE',
            details: { newVal: validAssignees, bulk: true },
          });

          results.push({ taskId: id, success: true });
        } else if (action === 'UPDATE_DUE_DATE') {
          const { dueDate } = payload;
          if (dueDate) {
            const selectedDate = new Date(dueDate);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            if (selectedDate < startOfToday) {
              results.push({ taskId: id, success: false, error: 'Due date cannot be in the past.' });
              continue;
            }
          }

          const newDate = dueDate ? new Date(dueDate) : null;
          task.dueDate = newDate;
          await task.save();

          await ActivityLog.create({
            task: task._id,
            actor: req.user._id,
            type: 'FIELD_UPDATE',
            details: { field: 'dueDate', newVal: newDate, bulk: true },
          });

          results.push({ taskId: id, success: true });
        }
      } catch (itemErr) {
        results.push({ taskId: id, success: false, error: itemErr.message || 'Operation failed.' });
      }
    }

    return res.json({ results });
  } catch (err) {
    console.error('Bulk action error:', err);
    return res.status(500).json({ error: 'Failed to process bulk action.' });
  }
});

module.exports = router;
