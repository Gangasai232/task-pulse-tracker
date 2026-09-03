require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const AlertDismissal = require('../models/AlertDismissal');

async function seedDatabase() {
  console.log('Seeding production dataset (Admin account only)...');

  // Clean existing non-admin data
  await User.deleteMany({ email: { $ne: 'admin@acme.com' } });

  const adminExists = await User.findOne({ email: 'admin@acme.com' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      name: 'System Administrator (Admin)',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      createdAt: new Date(),
    });
  }

  console.log('Production seed complete: Only Admin account (admin@acme.com) exists.');
}

async function seedDatabaseIfEmpty() {
  await seedDatabase();
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
