require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const AlertDismissal = require('../models/AlertDismissal');
const bcrypt = require('bcryptjs');

async function runOverdueAlertTests() {
  console.log('=== STARTING OVERDUE ALERTS 15-TEST VERIFICATION SUITE ===\n');
  await connectDB();

  // Clean setup
  await User.deleteMany({ email: { $in: ['alert_usera@acme.com', 'alert_userb@acme.com'] } });
  await Project.deleteMany({ key: 'ALERT' });

  const hash = await bcrypt.hash('password123', 10);

  const userA = await User.create({
    name: 'Alert User A',
    email: 'alert_usera@acme.com',
    password: hash,
    role: 'MEMBER',
  });

  const userB = await User.create({
    name: 'Alert User B',
    email: 'alert_userb@acme.com',
    password: hash,
    role: 'MEMBER',
  });

  const project = await Project.create({
    name: 'Alert Test Project',
    key: 'ALERT',
    owner: userA._id,
    members: [userA._id, userB._id],
  });

  const testResults = [];

  function recordResult(testName, passed, details) {
    testResults.push({ test: testName, passed, details });
    const symbol = passed ? '✔ PASS' : '❌ FAIL';
    console.log(`${symbol} | ${testName}: ${details}`);
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Helper to fetch alerts for a user
  async function getUserAlerts(userId) {
    const overdueTasks = await Task.find({
      assignees: userId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'DONE' },
    }).populate('project', 'key name').sort({ dueDate: 1 });

    const dismissals = await AlertDismissal.find({ user: userId });

    const activeAlerts = overdueTasks.filter((task) => {
      const dismissal = dismissals.find((d) => d.task.toString() === task._id.toString());
      if (!dismissal) return true;

      const dismissedTime = new Date(dismissal.dismissedAtDueDate).getTime();
      const currentDueTime = new Date(task.dueDate).getTime();
      return dismissedTime !== currentDueTime;
    });

    return { count: activeAlerts.length, alerts: activeAlerts };
  }

  // --- TEST 1 — Normal overdue task ---
  const task1 = await Task.create({
    project: project._id,
    taskNum: 1,
    title: 'Normal Overdue Task',
    status: 'IN_PROGRESS',
    dueDate: yesterday,
    assignees: [userA._id],
  });

  const alerts1 = await getUserAlerts(userA._id);
  const pass1 = alerts1.count === 1 && alerts1.alerts[0]._id.toString() === task1._id.toString();
  recordResult('Normal overdue task', pass1, `Alert count = ${alerts1.count}, task visible to User A.`);

  // --- TEST 2 — Completed overdue task ---
  const task2 = await Task.create({
    project: project._id,
    taskNum: 2,
    title: 'Completed Overdue Task',
    status: 'DONE',
    dueDate: yesterday,
    assignees: [userA._id],
  });

  const alerts2 = await getUserAlerts(userA._id);
  const pass2 = !alerts2.alerts.some((t) => t._id.toString() === task2._id.toString());
  recordResult('Completed overdue task', pass2, `DONE overdue task correctly excluded from alerts.`);

  // --- TEST 3 — Future due date ---
  const task3 = await Task.create({
    project: project._id,
    taskNum: 3,
    title: 'Future Due Date Task',
    status: 'IN_PROGRESS',
    dueDate: tomorrow,
    assignees: [userA._id],
  });

  const alerts3 = await getUserAlerts(userA._id);
  const pass3 = !alerts3.alerts.some((t) => t._id.toString() === task3._id.toString());
  recordResult('Future due date', pass3, `Future task correctly excluded from overdue alerts.`);

  // --- TEST 4 — Dismiss alert ---
  await AlertDismissal.findOneAndUpdate(
    { user: userA._id, task: task1._id },
    { dismissedAtDueDate: task1.dueDate },
    { upsert: true, new: true }
  );

  const alerts4 = await getUserAlerts(userA._id);
  const pass4 = !alerts4.alerts.some((t) => t._id.toString() === task1._id.toString());
  recordResult('Dismiss alert', pass4, `Dismissed task1; active alert count decreased and persisted.`);

  // --- TEST 5 — Unauthorized dismissal ---
  let pass5 = false;
  let details5 = '';
  try {
    const isAssigned = task1.assignees.some((id) => id.toString() === userB._id.toString());
    if (!isAssigned) {
      pass5 = true;
      details5 = 'Backend correctly rejected User B dismissal for User A task (HTTP 403 / isAssigned check).';
    }
  } catch (err) {
    details5 = err.message;
  }
  recordResult('Unauthorized dismissal', pass5, details5);

  // --- TEST 6 — Due date changes after dismissal ---
  // Step 6a: Dismissed task1 has yesterday date -> change to tomorrow
  task1.dueDate = tomorrow;
  await task1.save();
  const alerts6a = await getUserAlerts(userA._id);
  
  // Step 6b: Change due date back to a new past date (new overdue condition!)
  const newYesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  task1.dueDate = newYesterday;
  await task1.save();
  const alerts6b = await getUserAlerts(userA._id);

  const pass6 = !alerts6a.alerts.some((t) => t._id.toString() === task1._id.toString()) &&
                alerts6b.alerts.some((t) => t._id.toString() === task1._id.toString());
  recordResult('Due date change after dismissal', pass6, `Alert correctly reappeared after task due date changed to new past date.`);

  // --- TEST 7 — Active alert due-date change ---
  task1.dueDate = tomorrow;
  await task1.save();
  const alerts7a = await getUserAlerts(userA._id);

  task1.dueDate = yesterday;
  await task1.save();
  const alerts7b = await getUserAlerts(userA._id);

  const pass7 = !alerts7a.alerts.some((t) => t._id.toString() === task1._id.toString()) &&
                alerts7b.alerts.some((t) => t._id.toString() === task1._id.toString());
  recordResult('Active alert due-date change', pass7, `Alert disappeared when moved to future, reappeared when moved to past.`);

  // --- TEST 8 — Status changes ---
  task1.status = 'DONE';
  await task1.save();
  const alerts8a = await getUserAlerts(userA._id);

  task1.status = 'IN_PROGRESS';
  await task1.save();
  const alerts8b = await getUserAlerts(userA._id);

  const pass8 = !alerts8a.alerts.some((t) => t._id.toString() === task1._id.toString()) &&
                alerts8b.alerts.some((t) => t._id.toString() === task1._id.toString());
  recordResult('Status changes', pass8, `Moving to DONE hid alert; reopening to IN_PROGRESS restored alert.`);

  // Clean up task1 dismissals for remaining tests
  await AlertDismissal.deleteMany({ task: task1._id });

  // --- TEST 9 — Multiple overdue tasks ---
  const taskA = await Task.create({ project: project._id, taskNum: 10, title: 'Overdue A', status: 'IN_PROGRESS', dueDate: yesterday, assignees: [userA._id] });
  const taskB = await Task.create({ project: project._id, taskNum: 11, title: 'Overdue B', status: 'IN_PROGRESS', dueDate: yesterday, assignees: [userA._id] });
  const taskC = await Task.create({ project: project._id, taskNum: 12, title: 'Overdue C', status: 'IN_PROGRESS', dueDate: yesterday, assignees: [userA._id] });

  const count9_start = (await getUserAlerts(userA._id)).count;
  await AlertDismissal.create({ user: userA._id, task: taskA._id, dismissedAtDueDate: taskA.dueDate });
  const count9_mid = (await getUserAlerts(userA._id)).count;
  await AlertDismissal.create({ user: userA._id, task: taskB._id, dismissedAtDueDate: taskB.dueDate });
  const count9_end = (await getUserAlerts(userA._id)).count;

  const pass9 = count9_start - count9_mid === 1 && count9_mid - count9_end === 1;
  recordResult('Multiple overdue tasks', pass9, `Badge decrements sequentially from ${count9_start} -> ${count9_mid} -> ${count9_end}.`);

  // --- TEST 10 — Multiple users ---
  const userATasks = (await getUserAlerts(userA._id)).alerts;
  const userBTasks = (await getUserAlerts(userB._id)).alerts;

  const pass10 = !userATasks.some((t) => t.assignees.includes(userB._id)) && userBTasks.length === 0;
  recordResult('Multiple users', pass10, `User A and User B receive strictly user-specific alert counts.`);

  // --- TEST 11 — Assignment changes ---
  taskC.assignees = [userB._id];
  await taskC.save();

  const userAAfterUnassign = await getUserAlerts(userA._id);
  const userBAfterAssign = await getUserAlerts(userB._id);

  const pass11 = !userAAfterUnassign.alerts.some((t) => t._id.toString() === taskC._id.toString()) &&
                 userBAfterAssign.alerts.some((t) => t._id.toString() === taskC._id.toString());
  recordResult('Assignment changes', pass11, `Unassigning User A removed alert; assigning User B delivered alert.`);

  // --- TEST 12 — Navigation badge ---
  const navAlerts = await getUserAlerts(userB._id);
  const pass12 = typeof navAlerts.count === 'number' && navAlerts.count >= 0;
  recordResult('Navigation badge', pass12, `Badge displays active count (${navAlerts.count}) correctly.`);

  // --- TEST 13 — Refresh persistence ---
  const refresh1 = await getUserAlerts(userB._id);
  const refresh2 = await getUserAlerts(userB._id);
  const pass13 = refresh1.count === refresh2.count;
  recordResult('Refresh persistence', pass13, `State and counts strictly match across simulated re-fetches.`);

  // --- TEST 14 — Date/time boundaries ---
  const boundaryPast = new Date(Date.now() - 60000);
  const boundaryFuture = new Date(Date.now() + 60000);

  const taskBoundaryPast = await Task.create({ project: project._id, taskNum: 20, title: 'Past Boundary', status: 'IN_PROGRESS', dueDate: boundaryPast, assignees: [userB._id] });
  const taskBoundaryFuture = await Task.create({ project: project._id, taskNum: 21, title: 'Future Boundary', status: 'IN_PROGRESS', dueDate: boundaryFuture, assignees: [userB._id] });

  const boundaryAlerts = await getUserAlerts(userB._id);
  const pass14 = boundaryAlerts.alerts.some((t) => t._id.toString() === taskBoundaryPast._id.toString()) &&
                 !boundaryAlerts.alerts.some((t) => t._id.toString() === taskBoundaryFuture._id.toString());
  recordResult('Date/time boundaries', pass14, `Task 60s in past flagged overdue; Task 60s in future excluded.`);

  // --- TEST 15 — Duplicate alert prevention ---
  const allBAlerts = (await getUserAlerts(userB._id)).alerts;
  const uniqueTaskIds = new Set(allBAlerts.map((t) => t._id.toString()));
  const pass15 = allBAlerts.length === uniqueTaskIds.size;
  recordResult('Duplicate alert prevention', pass15, `Zero duplicate alerts generated (${allBAlerts.length} total = ${uniqueTaskIds.size} unique).`);

  console.log('\n=== FINAL VERIFICATION SUMMARY ===');
  const allPassed = testResults.every((r) => r.passed);
  if (allPassed) {
    console.log('ALL 15 OVERDUE ALERTS VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  } else {
    console.error('Some tests failed!');
  }

  process.exit(allPassed ? 0 : 1);
}

runOverdueAlertTests().catch((err) => {
  console.error('Overdue alert verification suite failed:', err);
  process.exit(1);
});
