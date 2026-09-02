const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const AlertDismissal = require('../models/AlertDismissal');
const { authMiddleware } = require('../middleware/auth');
const { STATUSES } = require('../utils/stateMachine');

// GET /api/dashboard/stats - Overview metrics, status breakdown, assignee breakdown, 8-week completions
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    let accessibleProjectIds = [];
    if (req.user.role === 'ADMIN') {
      const activeProjects = await Project.find({ archived: false }).select('_id');
      accessibleProjectIds = activeProjects.map((p) => p._id);
    } else {
      // MANAGER & MEMBER: Only calculate metrics for projects where user is owner or member
      const userProjects = await Project.find({
        archived: false,
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select('_id');
      accessibleProjectIds = userProjects.map((p) => p._id);
    }

    const baseFilter = { project: { $in: accessibleProjectIds } };
    const now = new Date();

    // 1. Headline numbers
    const openTasksCount = await Task.countDocuments({
      ...baseFilter,
      status: { $ne: STATUSES.DONE },
    });

    const overdueCount = await Task.countDocuments({
      ...baseFilter,
      dueDate: { $lt: now },
      status: { $ne: STATUSES.DONE },
    });

    // Start & End of current week
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const dueThisWeekCount = await Task.countDocuments({
      ...baseFilter,
      dueDate: { $gte: startOfWeek, $lt: endOfWeek },
      status: { $ne: STATUSES.DONE },
    });

    const completedThisWeekCount = await Task.countDocuments({
      ...baseFilter,
      status: STATUSES.DONE,
      updatedAt: { $gte: startOfWeek, $lt: endOfWeek },
    });

    // 2. Breakdown by status
    const statusAgg = await Task.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusBreakdown = Object.values(STATUSES).map((st) => {
      const match = statusAgg.find((s) => s._id === st);
      return { status: st, count: match ? match.count : 0 };
    });

    // 3. Breakdown by assignee
    const tasksWithAssignees = await Task.find(baseFilter).populate('assignees', 'name email role');
    const assigneeMap = {};

    tasksWithAssignees.forEach((t) => {
      if (!t.assignees || t.assignees.length === 0) {
        assigneeMap['Unassigned'] = (assigneeMap['Unassigned'] || 0) + 1;
      } else {
        t.assignees.forEach((user) => {
          const userName = user.name;
          assigneeMap[userName] = (assigneeMap[userName] || 0) + 1;
        });
      }
    });

    const assigneeBreakdown = Object.keys(assigneeMap).map((name) => ({
      name,
      count: assigneeMap[name],
    }));

    // 4. Completions over last 8 weeks
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 56);

    const completedTasks8Weeks = await Task.find({
      ...baseFilter,
      status: STATUSES.DONE,
      updatedAt: { $gte: eightWeeksAgo },
    }).select('updatedAt');

    // Group into 8 weekly buckets
    const weeklyCompletions = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7 - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = completedTasks8Weeks.filter(
        (t) => t.updatedAt >= weekStart && t.updatedAt < weekEnd
      ).length;

      const label = `Wk of ${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      weeklyCompletions.push({ week: label, count });
    }

    return res.json({
      headline: {
        openTasks: openTasksCount,
        overdueTasks: overdueCount,
        dueThisWeek: dueThisWeekCount,
        completedThisWeek: completedThisWeekCount,
      },
      statusBreakdown,
      assigneeBreakdown,
      weeklyCompletions,
    });
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// GET /api/dashboard/alerts - Active overdue alerts for current user
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const now = new Date();

    // Find overdue tasks assigned to current user
    const overdueTasks = await Task.find({
      assignees: req.user._id,
      dueDate: { $lt: now },
      status: { $ne: STATUSES.DONE },
    })
      .populate('project', 'key name')
      .sort({ dueDate: 1 });

    // Fetch user's active dismissals
    const dismissals = await AlertDismissal.find({ user: req.user._id });

    // Filter out dismissed tasks where task's current dueDate matches dismissedAtDueDate
    const activeAlerts = overdueTasks.filter((task) => {
      const dismissal = dismissals.find(
        (d) => d.task.toString() === task._id.toString()
      );
      if (!dismissal) return true;

      // If task due date changed after dismissal, alert reappears!
      const dismissedTime = new Date(dismissal.dismissedAtDueDate).getTime();
      const currentDueTime = new Date(task.dueDate).getTime();
      return dismissedTime !== currentDueTime;
    });

    return res.json({
      count: activeAlerts.length,
      alerts: activeAlerts,
    });
  } catch (err) {
    console.error('Fetch alerts error:', err);
    return res.status(500).json({ error: 'Failed to fetch overdue alerts.' });
  }
});

// POST /api/dashboard/alerts/dismiss - Dismiss overdue alert for a task
router.post('/alerts/dismiss', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required.' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Verify task is assigned to user
    const isAssigned = task.assignees.some((id) => id.toString() === req.user._id.toString());
    if (!isAssigned) {
      return res.status(403).json({ error: 'You can only dismiss alerts for tasks assigned to you.' });
    }

    // Upsert alert dismissal record
    await AlertDismissal.findOneAndUpdate(
      { user: req.user._id, task: task._id },
      { dismissedAtDueDate: task.dueDate },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Alert dismissed successfully.', taskId });
  } catch (err) {
    console.error('Dismiss alert error:', err);
    return res.status(500).json({ error: 'Failed to dismiss alert.' });
  }
});

module.exports = router;
