const Task = require('../models/Task');
const Project = require('../models/Project');
const AlertDismissal = require('../models/AlertDismissal');
const ActivityLog = require('../models/ActivityLog');
const { STATUSES } = require('../utils/stateMachine');

function getCalendarWeekStart(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getCalendarWeekEnd(mondayDate) {
  const sunday = new Date(mondayDate);
  sunday.setDate(mondayDate.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * @desc    Overview metrics, status breakdown, assignee breakdown, 8-week completions
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getStats = async (req, res) => {
  try {
    let accessibleProjectIds = [];
    if (req.user.role === 'ADMIN') {
      const activeProjects = await Project.find({ archived: false }).select('_id');
      accessibleProjectIds = activeProjects.map((p) => p._id);
    } else {
      const userProjects = await Project.find({
        archived: false,
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select('_id');
      accessibleProjectIds = userProjects.map((p) => p._id);
    }

    const baseFilter = { project: { $in: accessibleProjectIds } };
    if (req.user.role === 'MEMBER') {
      baseFilter.assignees = req.user._id;
    }
    const now = new Date();

    // 1. OPEN TASKS: Tasks that are not DONE
    const openTasks = await Task.countDocuments({
      ...baseFilter,
      status: { $ne: STATUSES.DONE },
    });

    // 2. OVERDUE TASKS: dueDate < now and status != DONE (Completed tasks NEVER count as overdue)
    const overdueTasks = await Task.countDocuments({
      ...baseFilter,
      dueDate: { $lt: now },
      status: { $ne: STATUSES.DONE },
    });

    // Current Calendar Week (Monday to Sunday)
    const currentWeekMonday = getCalendarWeekStart(now);
    const currentWeekSunday = getCalendarWeekEnd(currentWeekMonday);

    // 3. DUE THIS WEEK: Tasks whose due date falls within current calendar week
    const dueThisWeek = await Task.countDocuments({
      ...baseFilter,
      dueDate: { $gte: currentWeekMonday, $lte: currentWeekSunday },
    });

    // 4. COMPLETED THIS WEEK: Tasks completed during current calendar week
    const accessibleTasks = await Task.find(baseFilter).select('_id');
    const accessibleTaskIds = accessibleTasks.map((t) => t._id);

    const completionLogsThisWeek = await ActivityLog.find({
      task: { $in: accessibleTaskIds },
      type: 'STATUS_CHANGE',
      $or: [{ newValue: STATUSES.DONE }, { 'details.newValue': STATUSES.DONE }, { 'details.newVal': STATUSES.DONE }],
      createdAt: { $gte: currentWeekMonday, $lte: currentWeekSunday },
    }).distinct('task');

    const doneTasksUpdatedThisWeek = await Task.find({
      ...baseFilter,
      status: STATUSES.DONE,
      updatedAt: { $gte: currentWeekMonday, $lte: currentWeekSunday },
    }).select('_id');

    const completedThisWeekTaskIds = new Set([
      ...completionLogsThisWeek.map((id) => id.toString()),
      ...doneTasksUpdatedThisWeek.map((t) => t._id.toString()),
    ]);
    const completedThisWeek = completedThisWeekTaskIds.size;

    // 5. TASKS BY STATUS: Include all 5 status counts (BACKLOG, IN_PROGRESS, IN_REVIEW, BLOCKED, DONE)
    const statusAgg = await Task.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tasksByStatus = Object.values(STATUSES).map((st) => {
      const match = statusAgg.find((s) => s._id === st);
      return { status: st, count: match ? match.count : 0 };
    });

    // 6. TASKS BY ASSIGNEE: Breakdown by user + Unassigned
    const tasksWithAssignees = await Task.find(baseFilter).populate('assignees', 'name email role');
    const assigneeMap = new Map();
    let unassignedCount = 0;

    tasksWithAssignees.forEach((t) => {
      if (!t.assignees || t.assignees.length === 0) {
        unassignedCount++;
      } else {
        t.assignees.forEach((u) => {
          if (u && u._id) {
            const uId = u._id.toString();
            if (!assigneeMap.has(uId)) {
              assigneeMap.set(uId, { userId: uId, name: u.name, count: 0 });
            }
            assigneeMap.get(uId).count += 1;
          }
        });
      }
    });

    const tasksByAssignee = Array.from(assigneeMap.values());
    tasksByAssignee.push({ userId: null, name: 'Unassigned', count: unassignedCount });

    // 7. COMPLETIONS OVER LAST 8 WEEKS: 8 consecutive calendar weeks (Monday-Sunday)
    const completionsLast8Weeks = [];
    const sixtyDaysAgo = new Date(currentWeekMonday);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 56);

    const completionLogs = await ActivityLog.find({
      task: { $in: accessibleTaskIds },
      type: 'STATUS_CHANGE',
      $or: [{ newValue: STATUSES.DONE }, { 'details.newValue': STATUSES.DONE }, { 'details.newVal': STATUSES.DONE }],
      createdAt: { $gte: sixtyDaysAgo },
    }).select('task createdAt');

    const taskCompletionDateMap = new Map();
    completionLogs.forEach((log) => {
      const tId = log.task.toString();
      if (!taskCompletionDateMap.has(tId) || log.createdAt < taskCompletionDateMap.get(tId)) {
        taskCompletionDateMap.set(tId, log.createdAt);
      }
    });

    const doneTasksFallback = await Task.find({
      ...baseFilter,
      status: STATUSES.DONE,
      updatedAt: { $gte: sixtyDaysAgo },
    }).select('_id updatedAt createdAt');

    doneTasksFallback.forEach((t) => {
      const tId = t._id.toString();
      if (!taskCompletionDateMap.has(tId)) {
        taskCompletionDateMap.set(tId, t.updatedAt || t.createdAt);
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 7; i >= 0; i--) {
      const weekMonday = new Date(currentWeekMonday);
      weekMonday.setDate(currentWeekMonday.getDate() - i * 7);
      weekMonday.setHours(0, 0, 0, 0);

      const weekSunday = getCalendarWeekEnd(weekMonday);

      let weekCount = 0;
      taskCompletionDateMap.forEach((compDate) => {
        if (compDate >= weekMonday && compDate <= weekSunday) {
          weekCount++;
        }
      });

      const label = `${monthNames[weekMonday.getMonth()]} ${weekMonday.getDate()}`;
      completionsLast8Weeks.push({
        week: label,
        count: weekCount,
      });
    }

    return res.json({
      openTasks,
      overdueTasks,
      dueThisWeek,
      completedThisWeek,
      tasksByStatus,
      tasksByAssignee,
      completionsLast8Weeks,
      headline: { openTasks, overdueTasks, dueThisWeek, completedThisWeek },
      statusBreakdown: tasksByStatus,
      assigneeBreakdown: tasksByAssignee,
      weeklyCompletions: completionsLast8Weeks,
    });
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to calculate dashboard statistics.' });
  }
};

/**
 * @desc    Active overdue alerts for current user
 * @route   GET /api/dashboard/alerts
 * @access  Private
 */
const getAlerts = async (req, res) => {
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
};

/**
 * @desc    Dismiss overdue alert for a task
 * @route   POST /api/dashboard/alerts/dismiss
 * @access  Private
 */
const dismissAlert = async (req, res) => {
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
};

module.exports = {
  getStats,
  getAlerts,
  dismissAlert,
};
