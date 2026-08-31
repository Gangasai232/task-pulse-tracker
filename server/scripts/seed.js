const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const AlertDismissal = require('../models/AlertDismissal');

async function seedDatabase() {
  console.log('Seeding database with comprehensive demo dataset...');

  // Clean existing data
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  await ActivityLog.deleteMany({});
  await AlertDismissal.deleteMany({});

  // 1. Create Users with realistic distinct registration timestamps
  const hashedPassword = await bcrypt.hash('password123', 10);
  const nowMs = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const admin = await User.create({
    name: 'System Administrator (Admin)',
    email: 'admin@acme.com',
    password: hashedPassword,
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date(nowMs - 90 * DAY),
  });

  const manager = await User.create({
    name: 'Sarah Jenkins (Manager)',
    email: 'manager@acme.com',
    password: hashedPassword,
    role: 'MANAGER',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: new Date(nowMs - 60 * DAY),
  });

  const alice = await User.create({
    name: 'Alice Cooper',
    email: 'alice@acme.com',
    password: hashedPassword,
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    createdAt: new Date(nowMs - 30 * DAY),
  });

  const bob = await User.create({
    name: 'Bob Vance',
    email: 'bob@acme.com',
    password: hashedPassword,
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: new Date(nowMs - 15 * DAY),
  });

  const charlie = await User.create({
    name: 'Charlie Day',
    email: 'charlie@acme.com',
    password: hashedPassword,
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: new Date(nowMs - 5 * DAY),
  });

  console.log('Users created: Manager & 3 Members.');

  // 2. Create Projects
  const p1 = await Project.create({
    key: 'PRJ',
    name: 'Cloud Platform Modernization',
    description: 'Migration of legacy monolithic services to microservices and Kubernetes cluster.',
    owner: manager._id,
    members: [manager._id, alice._id, bob._id, charlie._id],
    archived: false,
  });

  const p2 = await Project.create({
    key: 'FIN',
    name: 'Fintech Mobile Application',
    description: 'iOS and Android mobile banking platform with realtime transaction tracking.',
    owner: manager._id,
    members: [manager._id, alice._id, bob._id],
    archived: false,
  });

  const p3 = await Project.create({
    key: 'HEALTH',
    name: 'Telehealth Portal Redesign',
    description: 'Patient video appointment booking portal complying with HIPAA standard.',
    owner: manager._id,
    members: [manager._id, charlie._id],
    archived: false,
  });

  const p4 = await Project.create({
    key: 'LEGACY',
    name: '2024 Legacy System Maintenance',
    description: 'Archived maintenance project for previous client contract.',
    owner: manager._id,
    members: [manager._id, bob._id],
    archived: true,
  });

  console.log('Projects created: 3 Active, 1 Archived.');

  // Dates setup
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // 3. Create Tasks
  // PRJ Tasks
  const t1 = await Task.create({
    project: p1._id,
    taskNum: 1,
    title: 'Design Microservices Architecture & OpenAPI Specs',
    description: 'Define service boundaries, API contracts, and schema representations.',
    priority: 'HIGH',
    status: 'DONE',
    dueDate: fiveDaysAgo,
    assignees: [alice._id],
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  });

  const t2 = await Task.create({
    project: p1._id,
    taskNum: 2,
    title: 'Deploy Kubernetes Cluster on AWS EKS',
    description: 'Provision terraform scripts for multi-region EKS cluster deployment.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    dueDate: inThreeDays,
    assignees: [bob._id, alice._id],
    blockingTasks: [t1._id],
  });

  const t3 = await Task.create({
    project: p1._id,
    taskNum: 3,
    title: 'Configure CI/CD Pipelines with GitHub Actions',
    description: 'Setup automated build, test, and container push pipelines.',
    priority: 'MEDIUM',
    status: 'BLOCKED',
    previousStatus: 'IN_PROGRESS',
    dueDate: inTenDays,
    assignees: [bob._id],
    blockingTasks: [t2._id],
  });

  const t4 = await Task.create({
    project: p1._id,
    taskNum: 4,
    title: 'Overdue: Database Schema Migration Strategy',
    description: 'CRITICAL OVERDUE TASK: Write zero-downtime database migration scripts for PostgreSQL.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    dueDate: threeDaysAgo, // OVERDUE!
    assignees: [alice._id],
  });

  const t5 = await Task.create({
    project: p1._id,
    taskNum: 5,
    title: 'Security Compliance Audit & Penetration Test',
    description: 'Run automated vulnerability scans and third-party security review.',
    priority: 'HIGH',
    status: 'BACKLOG',
    dueDate: inTenDays,
    assignees: [charlie._id],
  });

  // FIN Tasks
  const t6 = await Task.create({
    project: p2._id,
    taskNum: 1,
    title: 'Implement Biometric Authentication Flow',
    description: 'Add FaceID and TouchID integration for mobile app sign-in.',
    priority: 'HIGH',
    status: 'IN_REVIEW',
    dueDate: inThreeDays,
    assignees: [alice._id],
  });

  const t7 = await Task.create({
    project: p2._id,
    taskNum: 2,
    title: 'Overdue: Real-time Transaction Push Notifications',
    description: 'OVERDUE TASK: Integrate Firebase Cloud Messaging for account alerts.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    dueDate: threeDaysAgo, // OVERDUE!
    assignees: [bob._id],
  });

  const t8 = await Task.create({
    project: p2._id,
    taskNum: 3,
    title: 'Integrate Stripe Payment Gateway',
    description: 'Setup card processing and refund endpoints.',
    priority: 'HIGH',
    status: 'BACKLOG',
    dueDate: inTenDays,
    assignees: [bob._id],
  });

  // HEALTH Tasks
  const t9 = await Task.create({
    project: p3._id,
    taskNum: 1,
    title: 'HIPAA Video SDK Integration (Twilio)',
    description: 'Build patient video consultation rooms with end-to-end encryption.',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    dueDate: inThreeDays,
    assignees: [charlie._id],
  });

  // Create historical DONE tasks across 8 past weeks for dashboard chart
  for (let weekOffset = 1; weekOffset <= 8; weekOffset++) {
    const completionDate = new Date(now);
    completionDate.setDate(now.getDate() - weekOffset * 7 + 2);

    const taskCountInWeek = (weekOffset % 3) + 2; // 2 to 4 tasks per week
    for (let k = 0; k < taskCountInWeek; k++) {
      const historicalTask = await Task.create({
        project: p1._id,
        taskNum: 10 + weekOffset * 10 + k,
        title: `Historical Sprint Task ${weekOffset}.${k + 1}`,
        description: 'Completed task record for historical chart verification.',
        priority: 'MEDIUM',
        status: 'DONE',
        dueDate: completionDate,
        assignees: [alice._id, bob._id][k % 2],
        createdAt: completionDate,
        updatedAt: completionDate,
      });

      await ActivityLog.create({
        task: historicalTask._id,
        actor: manager._id,
        type: 'STATUS_CHANGE',
        details: { oldVal: 'IN_REVIEW', newVal: 'DONE' },
        createdAt: completionDate,
      });
    }
  }

  // 4. Create Activity Logs / Timeline entries
  await ActivityLog.create({
    task: t1._id,
    actor: manager._id,
    type: 'CREATED',
    details: { title: t1.title, priority: t1.priority },
    createdAt: fiveDaysAgo,
  });

  await ActivityLog.create({
    task: t1._id,
    actor: alice._id,
    type: 'STATUS_CHANGE',
    details: { oldVal: 'IN_REVIEW', newVal: 'DONE' },
    createdAt: fiveDaysAgo,
  });

  await ActivityLog.create({
    task: t1._id,
    actor: manager._id,
    type: 'COMMENT',
    comment: 'Great job getting the microservice boundaries documented early, Alice!',
    createdAt: fiveDaysAgo,
  });

  await ActivityLog.create({
    task: t4._id,
    actor: alice._id,
    type: 'COMMENT',
    comment: 'Working on migration scripts. Blocked on staging DB snapshot access.',
    createdAt: threeDaysAgo,
  });

  console.log('Seeding complete successfully!');
}

async function seedDatabaseIfEmpty() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Database empty. Running seed script automatically...');
    await seedDatabase();
  } else {
    console.log(`Database already populated with ${count} users. Skipping auto-seed.`);
  }
}

module.exports = {
  seedDatabase,
  seedDatabaseIfEmpty,
};

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}
