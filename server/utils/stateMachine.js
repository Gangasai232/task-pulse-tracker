const Task = require('../models/Task');

const STATUSES = {
  BACKLOG: 'BACKLOG',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

/**
  * Returns allowed next statuses from current status.
  */
function getLegalTransitions(currentStatus, previousStatus = null) {
  switch (currentStatus) {
    case STATUSES.BACKLOG:
      return [STATUSES.IN_PROGRESS];
    case STATUSES.IN_PROGRESS:
      return [STATUSES.IN_REVIEW, STATUSES.BLOCKED];
    case STATUSES.IN_REVIEW:
      return [STATUSES.DONE, STATUSES.IN_PROGRESS, STATUSES.BLOCKED];
    case STATUSES.BLOCKED:
      // Unblocking returns strictly to state it was blocked from
      return previousStatus ? [previousStatus] : [STATUSES.IN_PROGRESS, STATUSES.IN_REVIEW];
    case STATUSES.DONE:
      // Reopening returns to IN_PROGRESS
      return [STATUSES.IN_PROGRESS];
    default:
      return [];
  }
}

/**
  * Validates whether moving from currentStatus to targetStatus is permitted.
  */
function validateStatusTransition(currentStatus, targetStatus, previousStatus = null) {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowed = getLegalTransitions(currentStatus, previousStatus);
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      reason: `Illegal status transition from '${currentStatus}' to '${targetStatus}'. Allowed target status(es): ${allowed.join(', ')}.`,
    };
  }

  return { valid: true };
}

/**
  * Checks if task has any unfinished blocking tasks.
  */
async function checkUnfinishedBlockingTasks(task) {
  if (!task.blockingTasks || task.blockingTasks.length === 0) {
    return { hasUnfinished: false, unfinishedTasks: [] };
  }

  // Populate blocking tasks if not populated
  const blockingTaskDocs = await Task.find({ _id: { $in: task.blockingTasks } })
    .populate('project', 'key')
    .select('title status taskNum project');

  const unfinished = blockingTaskDocs.filter((t) => t.status !== STATUSES.DONE);

  if (unfinished.length > 0) {
    const titles = unfinished.map((t) => `${t.project ? t.project.key : 'TASK'}-${t.taskNum}: "${t.title}" (${t.status})`).join(', ');
    return {
      hasUnfinished: true,
      unfinishedTasks: unfinished,
      reason: `Cannot complete task because it is blocked by unfinished task(s): ${titles}`,
    };
  }

  return { hasUnfinished: false, unfinishedTasks: [] };
}

module.exports = {
  STATUSES,
  getLegalTransitions,
  validateStatusTransition,
  checkUnfinishedBlockingTasks,
};
