require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

// Route imports
const { router: eventsRouter } = require('./routes/events'); // SSE must be imported first to register global broadcaster
const studentsRouter = require('./routes/students');
const progressRouter = require('./routes/progress');
const questionsRouter = require('./routes/questions');
const interviewRouter = require('./routes/interview');
const plannerRouter = require('./routes/planner');
const resumeRouter = require('./routes/resume');
const opportunitiesRouter = require('./routes/opportunities');
const forgemindRouter = require('./routes/forgemind');
const reportsRouter = require('./routes/reports');
const { router: authRouter } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('vercel.app') ||
      origin.includes('onrender.com')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow all origins for production API
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure database is initialized before processing any requests
app.use(async (_req, _res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    console.error('Database initialization middleware error:', err);
    next(err);
  }
});

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/events', eventsRouter);
app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/forgemind', forgemindRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    groqConfigured: !!process.env.GROQ_API_KEY,
  });
});

// Root API Endpoint
app.get(['/api', '/'], (_req, res) => {
  res.json({
    success: true,
    project: 'CareerForge AI',
    status: 'Running',
    version: '1.0.0',
    message: 'CareerForge AI Backend is running successfully.',
    availableEndpoints: [
      '/api/health',
      '/api/auth',
      '/api/students',
      '/api/progress',
      '/api/questions',
      '/api/interview',
      '/api/planner',
      '/api/resume',
      '/api/forgemind',
      '/api/opportunities'
    ]
  });
});

// ── Error Handler ──────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb();

    let currentPort = parseInt(process.env.PORT || 5000, 10);
    const maxAttempts = 10;

    function listenOnPort(port, attemptsLeft) {
      const server = app.listen(port, () => {
        console.log(`
╔═══════════════════════════════════════════════════╗
║      CareerForge AI Backend — Port ${port}        ║
╚═══════════════════════════════════════════════════╝
  🚀 Server:  http://localhost:${port}
  🤖 Groq:    ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ NOT SET — add GROQ_API_KEY to .env'}
        `);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.warn(`[Port ${port} in use] Automatically trying next port ${port + 1}...`);
          listenOnPort(port + 1, attemptsLeft - 1);
        } else {
          console.error('Fatal server error:', err);
          process.exit(1);
        }
      });
    }

    listenOnPort(currentPort, maxAttempts);
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
module.exports = app;
