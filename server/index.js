const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

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

// Start Server
connectDB().then(async () => {
  // Auto seed database if empty
  const { seedDatabaseIfEmpty } = require('./scripts/seed');
  await seedDatabaseIfEmpty();

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
