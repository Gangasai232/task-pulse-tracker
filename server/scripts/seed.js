require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const AlertDismissal = require('../models/AlertDismissal');

async function seedDatabase() {
  console.log('Seeding clean deployment dataset (Admin account only)...');

  // Clean existing data
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});
  await ActivityLog.deleteMany({});
  await AlertDismissal.deleteMany({});

  // Create single primary System Admin account
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await User.create({
    name: 'System Administrator (Admin)',
    email: 'admin@acme.com',
    password: hashedPassword,
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date(),
  });

  console.log('Production deployment seed complete: Admin account created (admin@acme.com).');
}

async function seedDatabaseIfEmpty() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('Database empty. Running production deployment seed script automatically...');
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
