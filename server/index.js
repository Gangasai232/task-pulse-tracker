const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const { execSync } = require('child_process');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Helper to kill any stale process holding the port so npm start ALWAYS launches fresh
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`Cleared previous process (PID ${pid}) occupying port ${port}.`);
        }
      }
    }
  } catch (err) {
    // Port is free
  }
}

// Ensure port is free before starting
freePort(PORT);

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

// Serve client static build files & SPA fallback if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    const { seedDatabaseIfEmpty } = require('./scripts/seed');
    await seedDatabaseIfEmpty();

    const server = app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 TaskPulse Express Server started successfully!`);
      console.log(`Listening on: http://localhost:${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`==================================================\n`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} in use, freeing port and retrying...`);
        freePort(PORT);
        app.listen(PORT);
      } else {
        console.error('Server startup error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
  }
};

startServer();
