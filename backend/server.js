require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

// Route imports
const studentsRouter = require('./routes/students');
const progressRouter = require('./routes/progress');
const questionsRouter = require('./routes/questions');
const interviewRouter = require('./routes/interview');
const plannerRouter = require('./routes/planner');
const resumeRouter = require('./routes/resume');
const opportunitiesRouter = require('./routes/opportunities');
const forgemindRouter = require('./routes/forgemind');

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Performance Middleware ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const allowedOrigins = (process.env.CLIENT_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Allow mobile app & cross-domain fetch
    }
  },
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/students', studentsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/forgemind', forgemindRouter);

const path = require('path');
const fs = require('fs');

// ── Health & Info Route ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    groqConfigured: !!process.env.GROQ_API_KEY,
  });
});

// ── Static Frontend Production Build & Root Fallback Handler ─────────────
const distPath = path.join(__dirname, '../frontend/dist');
const hasDist = fs.existsSync(distPath);

if (hasDist) {
  console.log(`[Express] Serving production React build from ${distPath}`);
  app.use(express.static(distPath));
}

app.get('/', (_req, res) => {
  if (hasDist && fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.json({
      success: true,
      application: 'CareerForge AI Backend',
      status: 'Running',
      version: '1.0.0',
      frontend: 'http://localhost:5173',
      api: '/api/health'
    });
  }
});

// SPA Catch-all for non-API GET routes in Production
app.get(/^(?!\/api).*/, (_req, res, next) => {
  if (hasDist && fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

// ── 404 Handler for Unknown API Routes ────────────────────────────────────
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║      CareerForge AI Backend — Port ${PORT}        ║
╚═══════════════════════════════════════════════════╝
  🚀 Server:  http://0.0.0.0:${PORT}
  🤖 Groq:    ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ NOT SET — add GROQ_API_KEY to .env'}
      `);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
module.exports = app;
