const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server: bind port FIRST before DB connection to instantly check if port is already active
const server = app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 TaskPulse Express Server listening on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);

  // Connect to Database after port binding succeeds
  try {
    await connectDB();
    const { seedDatabaseIfEmpty } = require('./scripts/seed');
    await seedDatabaseIfEmpty();
    console.log(`==================================================\n`);
  } catch (dbErr) {
    console.error('Database connection error:', dbErr.message);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n==================================================`);
    console.log(`✅ TaskPulse Express Server is ALREADY RUNNING on port ${PORT}.`);
    console.log(`Your backend server is active and ready on http://localhost:${PORT}`);
    console.log(`==================================================\n`);
    process.exit(0);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
