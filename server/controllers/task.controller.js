const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const AlertDismissal = require('../models/AlertDismissal');
const {
  STATUSES,
  validateStatusTransition,
  checkUnfinishedBlockingTasks,
  getLegalTransitions,
} = require('../utils/stateMachine');

/**
 * @desc    Server-side list, search, filter, sort, paginate tasks
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res) => {
  try {
    const {
      projectId,
      search,
      status,
      assigneeId,
      priority,
      isOverdue,
      overdue,
      myTasksOnly,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    // Determine accessible projects for logged-in user
    let accessibleProjectIds = [];
    if (req.user.role === 'ADMIN') {
      const activeProjects = await Project.find({ archived: false }).select('_id');
      accessibleProjectIds = activeProjects.map((p) => p._id);
    } else {
      // MANAGER & MEMBER: Can view tasks in projects where user is owner or member
      const userProjects = await Project.find({
        archived: false,
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select('_id');
      accessibleProjectIds = userProjects.map((p) => p._id);
    }

    const filter = { project: { $in: accessibleProjectIds } };

    // Project filter & Authorization enforcement
    if (projectId) {
      const isAccessible = accessibleProjectIds.some(
        (pId) => pId.toString() === projectId.toString()
      );
      if (!isAccessible) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this project.' });
      }
      filter.project = projectId;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    // Assignee filter: specific user ID, unassigned, or my tasks only
    if (myTasksOnly === 'true') {
      filter.assignees = req.user._id;
    } else if (assigneeId === 'unassigned') {
      filter.$or = [{ assignees: { $exists: false } }, { assignees: { $size: 0 } }];
    } else if (assigneeId && assigneeId !== 'all') {
      filter.assignees = assigneeId;
    }

    // Overdue filter
    const now = new Date();
    const overdueParam = overdue || (isOverdue === 'true' ? 'overdue' : null);

    if (overdueParam === 'overdue' || overdueParam === 'true') {
      filter.dueDate = { $lt: now };
      filter.status = { $ne: STATUSES.DONE };
    } else if (overdueParam === 'not_overdue' || overdueParam === 'false') {
      filter.$or = [
        { dueDate: { $gte: now } },
        { dueDate: null },
        { status: STATUSES.DONE },
      ];
    }

    // Server-side Text Search over Title and Description
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(cleanSearch, 'i');

      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [
          { $or: existingOr },
          { $or: [{ title: regex }, { description: regex }] },
        ];
      } else {
        filter.$or = [{ title: regex }, { description: regex }];
      }
    }

    const totalMatches = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalMatches / limitNum) || 1;
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    let tasks = [];

    if (sortBy === 'priority') {
      // Deterministic priority ordering: URGENT (4) > HIGH (3) > MEDIUM (2) > LOW (1)
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            priorityWeight: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'URGENT'] }, then: 4 },
                  { case: { $eq: ['$priority', 'HIGH'] }, then: 3 },
                  { case: { $eq: ['$priority', 'MEDIUM'] }, then: 2 },
                  { case: { $eq: ['$priority', 'LOW'] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
        },
        { $sort: { priorityWeight: sortDir, updatedAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ];

      const rawAggResults = await Task.aggregate(pipeline);
      const rawIds = rawAggResults.map((r) => r._id);

      const populatedTasks = await Task.find({ _id: { $in: rawIds } })
        .populate('project', 'key name archived')
        .populate('assignees', 'name email avatarUrl role')
        .populate('blockingTasks', 'title status taskNum project');

      tasks = rawIds
        .map((id) => populatedTasks.find((t) => t._id.toString() === id.toString()))
        .filter(Boolean);
    } else {
      const sortFieldMap = {
        dueDate: 'dueDate',
        updatedAt: 'updatedAt',
        createdAt: 'createdAt',
        title: 'title',
      };
      const sortField = sortFieldMap[sortBy] || 'updatedAt';

      tasks = await Task.find(filter)
        .populate('project', 'key name archived')
        .populate('assignees', 'name email avatarUrl role')
        .populate('blockingTasks', 'title status taskNum project')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNum);
    }

    // Attach legal transitions to each task object
    const formattedTasks = tasks.map((t) => {
      const taskObj = t.toObject();
      taskObj.legalTransitions = getLegalTransitions(t.status, t.previousStatus);
      return taskObj;
    });

    const paginationMeta = {
      page: pageNum,
      limit: limitNum,
      total: totalMatches,
      totalPages: totalPages,
    };

    return res.json({
      tasks: formattedTasks,
      total: totalMatches,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages,
      pagination: paginationMeta,
    });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks: ' + err.message });
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res) => {
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

    // Access check: Only project members, managers, or admins can create tasks
    if (
      req.user.role !== 'MANAGER' &&
      req.user.role !== 'ADMIN' &&
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
};

/**
 * @desc    Get single task details with timeline history & comments
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTask = async (req, res) => {
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
      .populate('targetUser', 'name email avatarUrl role')
      .sort({ createdAt: 1 });

    const taskObj = task.toObject();
    taskObj.legalTransitions = getLegalTransitions(task.status, task.previousStatus);
    taskObj.timeline = timeline;

    return res.json(taskObj);
  } catch (err) {
    console.error('Get task details error:', err);
    return res.status(500).json({ error: 'Failed to fetch task details.' });
  }
};

/**
 * @desc    Update task details & state machine transition
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
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

    // If status or dueDate changed, clear prior alert dismissals so new overdue conditions re-trigger alerts
    if ((status && status !== task.status) || dueDate !== undefined) {
      await AlertDismissal.deleteMany({ task: task._id });
    }

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
        oldValue: oldStatus,
        newValue: status,
        details: { oldValue: oldStatus, newValue: status },
      });
    }

    // Explicit Assignee Addition and Removal tracking
    if (assignees !== undefined && Array.isArray(assignees)) {
      let validAssignees = assignees;
      if (projectMemberIds.length > 0) {
        validAssignees = assignees.filter((aId) => projectMemberIds.includes(aId.toString()));
      }

      const oldAssigneeIds = task.assignees.map((id) => (id._id ? id._id.toString() : id.toString()));
      const newAssigneeIds = validAssignees.map((id) => id.toString());

      const addedUserIds = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
      const removedUserIds = oldAssigneeIds.filter((id) => !newAssigneeIds.includes(id));

      for (const uId of removedUserIds) {
        logsToCreate.push({
          task: task._id,
          actor: req.user._id,
          type: 'UNASSIGNED',
          targetUser: uId,
          details: { userId: uId, reason: 'Unassigned from task' },
        });
      }

      for (const uId of addedUserIds) {
        logsToCreate.push({
          task: task._id,
          actor: req.user._id,
          type: 'ASSIGNED',
          targetUser: uId,
          details: { userId: uId },
        });
      }

      if (addedUserIds.length > 0 || removedUserIds.length > 0) {
        task.assignees = validAssignees;
      }
    }

    // Field updates with oldValue and newValue validation
    if (title !== undefined && title.trim() !== task.title) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_CHANGE',
        field: 'title',
        oldValue: task.title,
        newValue: title.trim(),
        details: { field: 'title', oldValue: task.title, newValue: title.trim() },
      });
      task.title = title.trim();
    }

    if (description !== undefined && (description || '') !== (task.description || '')) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_CHANGE',
        field: 'description',
        oldValue: task.description || '',
        newValue: description || '',
        details: { field: 'description', oldValue: task.description || '', newValue: description || '' },
      });
      task.description = description;
    }

    if (priority !== undefined && priority !== task.priority) {
      logsToCreate.push({
        task: task._id,
        actor: req.user._id,
        type: 'FIELD_CHANGE',
        field: 'priority',
        oldValue: task.priority,
        newValue: priority,
        details: { field: 'priority', oldValue: task.priority, newValue: priority },
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

      const newDateStr = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      const oldDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;

      if (newDateStr !== oldDateStr) {
        logsToCreate.push({
          task: task._id,
          actor: req.user._id,
          type: 'FIELD_CHANGE',
          field: 'dueDate',
          oldValue: oldDateStr,
          newValue: newDateStr,
          details: { field: 'dueDate', oldValue: oldDateStr, newValue: newDateStr },
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
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private (MANAGER, ADMIN)
 */
const deleteTask = async (req, res) => {
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
};

/**
 * @desc    Add immutable comment to task timeline
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
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

    const populatedLog = await ActivityLog.findById(log._id)
      .populate('actor', 'name email avatarUrl role')
      .populate('targetUser', 'name email avatarUrl role');

    return res.status(201).json(populatedLog);
  } catch (err) {
    console.error('Add comment error:', err);
    return res.status(500).json({ error: 'Failed to add comment.' });
  }
};

/**
 * @desc    Bulk action runner (status updates, assignee changes, due date updates)
 * @route   POST /api/tasks/bulk
 * @access  Private
 */
const bulkAction = async (req, res) => {
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
        if (
          req.user.role !== 'MANAGER' &&
          req.user.role !== 'ADMIN' &&
          !projectMemberIds.includes(req.user._id.toString())
        ) {
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
            oldValue: oldStatus,
            newValue: targetStatus,
            details: { oldValue: oldStatus, newValue: targetStatus },
            metadata: { bulk: true },
          });

          results.push({ taskId: id, success: true });
        } else if (action === 'UPDATE_ASSIGNEES') {
          const { assignees } = payload;
          const validAssignees = (assignees || []).filter((aId) => projectMemberIds.includes(aId.toString()));

          const oldAssigneeIds = task.assignees.map((id) => (id._id ? id._id.toString() : id.toString()));
          const newAssigneeIds = validAssignees.map((id) => id.toString());

          const addedUserIds = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
          const removedUserIds = oldAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));

          for (const uId of removedUserIds) {
            await ActivityLog.create({
              task: task._id,
              actor: req.user._id,
              type: 'UNASSIGNED',
              targetUser: uId,
              details: { userId: uId, reason: 'Bulk unassignment' },
              metadata: { bulk: true },
            });
          }

          for (const uId of addedUserIds) {
            await ActivityLog.create({
              task: task._id,
              actor: req.user._id,
              type: 'ASSIGNED',
              targetUser: uId,
              details: { userId: uId },
              metadata: { bulk: true },
            });
          }

          if (addedUserIds.length > 0 || removedUserIds.length > 0) {
            task.assignees = validAssignees;
            await task.save();
          }

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

          const newDateStr = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
          const oldDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;

          if (newDateStr !== oldDateStr) {
            task.dueDate = dueDate ? new Date(dueDate) : null;
            await task.save();

            await ActivityLog.create({
              task: task._id,
              actor: req.user._id,
              type: 'FIELD_CHANGE',
              field: 'dueDate',
              oldValue: oldDateStr,
              newValue: newDateStr,
              details: { field: 'dueDate', oldValue: oldDateStr, newValue: newDateStr },
              metadata: { bulk: true },
            });
          }

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
};

module.exports = {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  bulkAction,
};
