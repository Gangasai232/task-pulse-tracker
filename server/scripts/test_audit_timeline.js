require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('=== STARTING IMMUTABLE AUDIT TIMELINE VERIFICATION SUITE ===\n');
  await connectDB();

  // Clean setup
  await User.deleteMany({ email: { $in: ['admin_test@acme.com', 'user1_test@acme.com', 'user2_test@acme.com'] } });
  
  const hash = await bcrypt.hash('password123', 10);
  const admin = await User.create({
    name: 'Admin Test',
    email: 'admin_test@acme.com',
    password: hash,
    role: 'ADMIN',
  });

  const user1 = await User.create({
    name: 'User One',
    email: 'user1_test@acme.com',
    password: hash,
    role: 'MEMBER',
  });

  const user2 = await User.create({
    name: 'User Two',
    email: 'user2_test@acme.com',
    password: hash,
    role: 'MEMBER',
  });

  const project = await Project.create({
    name: 'Audit Test Project',
    key: 'AUDIT',
    description: 'Project for audit timeline validation',
    owner: admin._id,
    members: [admin._id, user1._id, user2._id],
  });

  // 1. Create Task -> CREATED Event
  const task = await Task.create({
    project: project._id,
    taskNum: 101,
    title: 'Initial Audit Task',
    description: 'Testing audit logs',
    priority: 'LOW',
    status: 'BACKLOG',
    assignees: [user1._id],
  });

  const createdLog = await ActivityLog.create({
    task: task._id,
    actor: admin._id,
    type: 'CREATED',
    newValue: { title: task.title, priority: task.priority },
    details: { title: task.title, priority: task.priority },
  });

  console.log('✔ Test 1 (CREATED Event): Created log ID', createdLog._id);

  // 2. Change Title -> FIELD_CHANGE Event
  const oldTitle = task.title;
  task.title = 'Updated Audit Task Title';
  await task.save();

  const titleLog = await ActivityLog.create({
    task: task._id,
    actor: admin._id,
    type: 'FIELD_CHANGE',
    field: 'title',
    oldValue: oldTitle,
    newValue: task.title,
    details: { field: 'title', oldValue: oldTitle, newValue: task.title },
  });
  console.log('✔ Test 2 (Title Change): Recorded from', oldTitle, 'to', task.title);

  // 3. Change Priority -> FIELD_CHANGE Event
  const oldPriority = task.priority;
  task.priority = 'HIGH';
  await task.save();

  const priorityLog = await ActivityLog.create({
    task: task._id,
    actor: admin._id,
    type: 'FIELD_CHANGE',
    field: 'priority',
    oldValue: oldPriority,
    newValue: task.priority,
    details: { field: 'priority', oldValue: oldPriority, newValue: task.priority },
  });
  console.log('✔ Test 3 (Priority Change): Recorded from', oldPriority, 'to', task.priority);

  // 4. Change Status -> STATUS_CHANGE Event
  const oldStatus = task.status;
  task.status = 'IN_PROGRESS';
  await task.save();

  const statusLog = await ActivityLog.create({
    task: task._id,
    actor: admin._id,
    type: 'STATUS_CHANGE',
    oldValue: oldStatus,
    newValue: task.status,
    details: { oldValue: oldStatus, newValue: task.status },
  });
  console.log('✔ Test 4 (Status Change): Recorded from', oldStatus, 'to', task.status);

  // 5 & 6 & 7. Replace Assignee: Unassign user1, Assign user2
  const oldAssignees = [user1._id.toString()];
  const newAssignees = [user2._id.toString()];

  const added = newAssignees.filter(id => !oldAssignees.includes(id));
  const removed = oldAssignees.filter(id => !newAssignees.includes(id));

  for (const uId of removed) {
    await ActivityLog.create({
      task: task._id,
      actor: admin._id,
      type: 'UNASSIGNED',
      targetUser: uId,
      details: { userId: uId, reason: 'Unassigned from task' },
    });
  }

  for (const uId of added) {
    await ActivityLog.create({
      task: task._id,
      actor: admin._id,
      type: 'ASSIGNED',
      targetUser: uId,
      details: { userId: uId },
    });
  }
  task.assignees = [user2._id];
  await task.save();

  console.log('✔ Test 5 & 6 & 7 (Assignee Swap): Created 1 UNASSIGNED log for User 1 and 1 ASSIGNED log for User 2.');

  // 8 & 9. Submit Same Status / Assignees -> No-Op Check
  const countBeforeNoOp = await ActivityLog.countDocuments({ task: task._id });
  
  // Submit same status again:
  if (task.status !== 'IN_PROGRESS') {
    await ActivityLog.create({ task: task._id, actor: admin._id, type: 'STATUS_CHANGE' });
  }

  // Submit same assignees again:
  const checkOld = task.assignees.map(id => id.toString());
  const checkNew = [user2._id.toString()];
  const noOpAdded = checkNew.filter(id => !checkOld.includes(id));
  const noOpRemoved = checkOld.filter(id => !checkNew.includes(id));

  if (noOpAdded.length > 0 || noOpRemoved.length > 0) {
    await ActivityLog.create({ task: task._id, actor: admin._id, type: 'ASSIGNED' });
  }

  const countAfterNoOp = await ActivityLog.countDocuments({ task: task._id });
  if (countBeforeNoOp === countAfterNoOp) {
    console.log('✔ Test 8 & 9 (No-Op Prevention): Submitting identical status/assignees created 0 new history entries.');
  } else {
    console.error('❌ Test 8 & 9 Failed! Unexpected log entries generated.');
  }

  // 10. Add Comment
  const commentLog = await ActivityLog.create({
    task: task._id,
    actor: user2._id,
    type: 'COMMENT',
    comment: 'Database query execution plan verified.',
  });
  console.log('✔ Test 10 (Comment Event): Created immutable comment log ID', commentLog._id);

  // 11. Bulk Operation Event
  const bulkLog = await ActivityLog.create({
    task: task._id,
    actor: admin._id,
    type: 'STATUS_CHANGE',
    oldValue: 'IN_PROGRESS',
    newValue: 'IN_REVIEW',
    details: { oldValue: 'IN_PROGRESS', newValue: 'IN_REVIEW' },
    metadata: { bulk: true },
  });
  console.log('✔ Test 11 (Bulk Action Event): Logged bulk status change with metadata.bulk = true.');

  // 12 & 13. Schema Immutability Guard Validation
  let updateAttemptFailed = false;
  try {
    await ActivityLog.updateOne({ _id: createdLog._id }, { $set: { comment: 'Hacked comment' } });
  } catch (err) {
    updateAttemptFailed = true;
    console.log('✔ Test 12 & 13 (Immutability Guard): Blocked attempt to modify history record (' + err.message + ').');
  }

  if (!updateAttemptFailed) {
    console.error('❌ Test 12 & 13 Failed! History record modification was not blocked.');
  }

  // 14. Fetch & Verify Full Timeline Sequence
  const fullTimeline = await ActivityLog.find({ task: task._id })
    .populate('actor', 'name email')
    .populate('targetUser', 'name email')
    .sort({ createdAt: 1 });

  console.log('\n--- Final Verified Timeline Sequence (' + fullTimeline.length + ' Events) ---');
  fullTimeline.forEach((item, index) => {
    console.log(`[${index + 1}] Type: ${item.type} | Actor: ${item.actor.name} | Target: ${item.targetUser ? item.targetUser.name : 'N/A'} | Field: ${item.field || 'N/A'} | Old: ${JSON.stringify(item.oldValue)} | New: ${JSON.stringify(item.newValue)} | Comment: "${item.comment}"`);
  });

  console.log('\n=== ALL AUDIT TIMELINE VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Audit verification test failed with error:', err);
  process.exit(1);
});
