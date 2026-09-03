require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');

function getCalendarWeekStart(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay();
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

async function runDashboardTests() {
  console.log('=== STARTING DASHBOARD ANALYTICS VERIFICATION SUITE ===\n');
  await connectDB();

  // Clean setup
  await User.deleteMany({ email: 'dash_admin@acme.com' });
  await Project.deleteMany({ key: 'DASH' });

  const hash = await bcrypt.hash('password123', 10);
  const admin = await User.create({
    name: 'Dashboard Admin',
    email: 'dash_admin@acme.com',
    password: hash,
    role: 'ADMIN',
  });

  const project = await Project.create({
    name: 'Dashboard Test Project',
    key: 'DASH',
    owner: admin._id,
    members: [admin._id],
  });

  const now = new Date();
  const currentWeekMonday = getCalendarWeekStart(now);
  const currentWeekSunday = getCalendarWeekEnd(currentWeekMonday);

  // 1. Overdue Open Task
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const overdueTask = await Task.create({
    project: project._id,
    taskNum: 1,
    title: 'Overdue Open Task',
    status: 'IN_PROGRESS',
    dueDate: yesterday,
    assignees: [admin._id],
  });

  // 2. Overdue Completed Task (Must NOT count as overdue)
  const overdueDoneTask = await Task.create({
    project: project._id,
    taskNum: 2,
    title: 'Overdue Done Task',
    status: 'DONE',
    dueDate: yesterday,
    assignees: [admin._id],
  });

  // 3. Task Due This Week
  const dueThisWeekTask = await Task.create({
    project: project._id,
    taskNum: 3,
    title: 'Due This Week Task',
    status: 'BACKLOG',
    dueDate: currentWeekSunday,
    assignees: [],
  });

  // 4. Task Completed This Week via ActivityLog
  const completedThisWeekTask = await Task.create({
    project: project._id,
    taskNum: 4,
    title: 'Completed This Week Task',
    status: 'DONE',
    assignees: [admin._id],
  });

  await ActivityLog.create({
    task: completedThisWeekTask._id,
    actor: admin._id,
    type: 'STATUS_CHANGE',
    oldValue: 'IN_REVIEW',
    newValue: 'DONE',
    createdAt: new Date(),
  });

  // 5. Task Completed 3 Weeks Ago via ActivityLog
  const threeWeeksAgoDate = new Date(currentWeekMonday);
  threeWeeksAgoDate.setDate(threeWeeksAgoDate.getDate() - 21);

  const completed3WeeksAgoTask = await Task.create({
    project: project._id,
    taskNum: 5,
    title: 'Completed 3 Weeks Ago Task',
    status: 'DONE',
    assignees: [admin._id],
  });

  await ActivityLog.create({
    task: completed3WeeksAgoTask._id,
    actor: admin._id,
    type: 'STATUS_CHANGE',
    oldValue: 'IN_PROGRESS',
    newValue: 'DONE',
    createdAt: threeWeeksAgoDate,
  });

  // Calculate Verification Assertions
  const baseFilter = { project: project._id };

  const openTasks = await Task.countDocuments({ ...baseFilter, status: { $ne: 'DONE' } });
  const overdueTasks = await Task.countDocuments({ ...baseFilter, dueDate: { $lt: now }, status: { $ne: 'DONE' } });
  const dueThisWeek = await Task.countDocuments({ ...baseFilter, dueDate: { $gte: currentWeekMonday, $lte: currentWeekSunday } });

  console.log(`✔ Assert OPEN TASKS (Expected: 2, Actual: ${openTasks})`);
  console.log(`✔ Assert OVERDUE TASKS (Expected: 1, Actual: ${overdueTasks}) -- Overdue DONE task correctly excluded.`);
  console.log(`✔ Assert DUE THIS WEEK (Expected: 3, Actual: ${dueThisWeek})`);

  if (openTasks !== 2 || overdueTasks !== 1 || dueThisWeek !== 3) {
    console.error('❌ Assertion failed for primary KPI headline numbers!');
    process.exit(1);
  }

  console.log('\n=== ALL DASHBOARD ANALYTICS VERIFICATION TESTS PASSED! ===');
  process.exit(0);
}

runDashboardTests().catch((err) => {
  console.error('Dashboard verification test failed:', err);
  process.exit(1);
});
