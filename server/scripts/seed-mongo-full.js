require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('../config/db');

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

const usersData = require('../../mongodb_seed_data/users.json');
const projectsData = require('../../mongodb_seed_data/projects.json');
const tasksData = require('../../mongodb_seed_data/tasks.json');
const activityLogsData = require('../../mongodb_seed_data/activitylogs.json');

function transformEjson(data) {
  return data.map((item) => {
    const doc = { ...item };
    if (doc._id && doc._id.$oid) doc._id = doc._id.$oid;
    if (doc.owner && doc.owner.$oid) doc.owner = doc.owner.$oid;
    if (doc.project && doc.project.$oid) doc.project = doc.project.$oid;
    if (doc.actor && doc.actor.$oid) doc.actor = doc.actor.$oid;
    if (doc.targetUser && doc.targetUser.$oid) doc.targetUser = doc.targetUser.$oid;
    if (doc.task && doc.task.$oid) doc.task = doc.task.$oid;

    if (doc.members && Array.isArray(doc.members)) {
      doc.members = doc.members.map((m) => (m.$oid ? m.$oid : m));
    }
    if (doc.assignees && Array.isArray(doc.assignees)) {
      doc.assignees = doc.assignees.map((a) => (a.$oid ? a.$oid : a));
    }
    if (doc.blockingTasks && Array.isArray(doc.blockingTasks)) {
      doc.blockingTasks = doc.blockingTasks.map((b) => (b.$oid ? b.$oid : b));
    }

    if (doc.dueDate && doc.dueDate.$date) doc.dueDate = new Date(doc.dueDate.$date);
    if (doc.createdAt && doc.createdAt.$date) doc.createdAt = new Date(doc.createdAt.$date);
    if (doc.updatedAt && doc.updatedAt.$date) doc.updatedAt = new Date(doc.updatedAt.$date);

    return doc;
  });
}

async function seedFull() {
  try {
    console.log('Connecting to MongoDB database...');
    await connectDB();

    console.log('Clearing existing collection data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});

    console.log('Inserting Users...');
    await User.insertMany(transformEjson(usersData));

    console.log('Inserting Projects...');
    await Project.insertMany(transformEjson(projectsData));

    console.log('Inserting Tasks...');
    await Task.insertMany(transformEjson(tasksData));

    console.log('Inserting Activity Logs...');
    await ActivityLog.insertMany(transformEjson(activityLogsData));

    console.log('\n==================================================');
    console.log(' SUCCESS: Database fully seeded with production sample data!');
    console.log(' Admin Account: admin@acme.com / password123');
    console.log(' Manager Account: sarah.jenkins@acme.com / password123');
    console.log(' Manager Account: david.chen@acme.com / password123');
    console.log(' Member Account: alex.rivera@acme.com / password123');
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Failed to seed MongoDB:', err);
    process.exit(1);
  }
}

seedFull();
