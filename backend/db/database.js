const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'preppilot.db');

let db = null;
let SQL = null;

/**
 * Initialize sql.js and load or create the database file.
 * Returns the database instance.
 */
async function initDb() {
  if (db) return db;

  // Dynamically require sql.js
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('✅ Created new database at', DB_PATH);
  }

  db.run('PRAGMA foreign_keys = ON;');
  initializeSchema();
  persistDb(); // save initial state

  return db;
}

/**
 * Persist the in-memory database to disk.
 * Call this after every write operation.
 */
function persistDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initializeSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      firebase_uid TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'student',
      photo_url TEXT,
      leetcode_username TEXT,
      target_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Safe migrations for existing database file
  const safeAddColumn = (columnDef) => {
    try { db.run(`ALTER TABLE students ADD COLUMN ${columnDef}`); } catch (e) {}
  };
  safeAddColumn('firebase_uid TEXT');
  safeAddColumn('email TEXT');
  safeAddColumn('password TEXT');
  safeAddColumn('role TEXT DEFAULT \'student\'');
  safeAddColumn('photo_url TEXT');
  safeAddColumn('leetcode_username TEXT');
  safeAddColumn('leetcode_total_solved INTEGER DEFAULT 0');
  safeAddColumn('department TEXT DEFAULT \'CSE\'');
  safeAddColumn('year TEXT DEFAULT \'4th Year\'');
  safeAddColumn('last_login TEXT DEFAULT (datetime(\'now\'))');
  safeAddColumn('resume_score INTEGER DEFAULT 0');
  safeAddColumn('coding_score INTEGER DEFAULT 0');
  safeAddColumn('interview_score INTEGER DEFAULT 0');
  safeAddColumn('placement_readiness INTEGER DEFAULT 0');
  safeAddColumn('study_hours INTEGER DEFAULT 0');
  safeAddColumn('problems_solved INTEGER DEFAULT 0');
  safeAddColumn('current_streak INTEGER DEFAULT 0');
  safeAddColumn('resume_uploaded INTEGER DEFAULT 0');
  safeAddColumn('planner_completed INTEGER DEFAULT 0');
  safeAddColumn('profile_completion INTEGER DEFAULT 20');
  safeAddColumn('status TEXT DEFAULT \'New Student\'');

  try { db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student';`); } catch (e) {}

  try { db.run(`ALTER TABLE plans ADD COLUMN target_company TEXT;`); } catch (e) {}

  // Reset existing linked LeetCode accounts per user request so all accounts can link fresh
  try {
    db.run(`UPDATE students SET leetcode_username = NULL, leetcode_total_solved = 0;`);
    db.run(`DELETE FROM progress_entries WHERE platform = 'LeetCode';`);
  } catch (e) {}

  // ── progress_entries: safe migration to add inline UNIQUE constraint ────────
  //
  // SQLite's ON CONFLICT clause in INSERT only fires for constraints that are
  // defined INSIDE CREATE TABLE. A separately-created UNIQUE INDEX does NOT
  // satisfy it. So we must ensure the table was created with
  // UNIQUE(student_id, platform, topic) in the DDL itself.
  //
  // Since ALTER TABLE cannot add constraints in SQLite, we use the
  // official SQLite migration pattern: create-new → copy → drop → rename.
  //
  // We detect whether the constraint already exists by inspecting the stored
  // CREATE TABLE SQL in sqlite_master.

  const progressTableInfo = queryOne(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='progress_entries'`
  );

  const needsMigration = !progressTableInfo ||
    !progressTableInfo.sql ||
    !progressTableInfo.sql.toLowerCase().includes('unique(student_id');

  if (needsMigration) {
    console.log('🔧 Migrating progress_entries table to add inline UNIQUE constraint...');

    try {
      // 1. Create the new table WITHOUT FK clause in the temp table.
      //    sql.js doesn't reliably support PRAGMA foreign_keys = OFF,
      //    so we avoid the FK check during migration entirely.
      //    The renamed final table has the correct FK definition.
      db.run(`DROP TABLE IF EXISTS progress_entries_new;`);
      db.run(`
        CREATE TABLE progress_entries_new (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id     INTEGER NOT NULL,
          topic          TEXT    NOT NULL,
          platform       TEXT    NOT NULL,
          problems_solved INTEGER NOT NULL DEFAULT 0,
          date_added     TEXT    DEFAULT (datetime('now')),
          UNIQUE(student_id, platform, topic)
        );
      `);

      // 2. Copy existing data; INSERT OR IGNORE deduplicates —
      //    ORDER BY problems_solved DESC keeps the highest count per unique key.
      if (progressTableInfo) {
        db.run(`
          INSERT OR IGNORE INTO progress_entries_new
            (id, student_id, topic, platform, problems_solved, date_added)
          SELECT id, student_id, topic, platform, problems_solved, date_added
          FROM progress_entries
          ORDER BY problems_solved DESC;
        `);

        // 3. Drop old table
        db.run(`DROP TABLE progress_entries;`);
      }

      // 4. Rename to canonical name
      db.run(`ALTER TABLE progress_entries_new RENAME TO progress_entries;`);

      console.log('✅ progress_entries migration complete — UNIQUE(student_id, platform, topic) now in DDL');
    } catch (migrationErr) {
      console.error('⚠️  progress_entries migration failed (will use existing table):', migrationErr.message);
      // Clean up temp table if it exists
      try { db.run(`DROP TABLE IF EXISTS progress_entries_new;`); } catch (e) {}
    }

    // Table already has the correct schema — just ensure the table exists
    db.run(`
      CREATE TABLE IF NOT EXISTS progress_entries (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id     INTEGER NOT NULL,
        topic          TEXT    NOT NULL,
        platform       TEXT    NOT NULL,
        problems_solved INTEGER NOT NULL DEFAULT 0,
        date_added     TEXT    DEFAULT (datetime('now')),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(student_id, platform, topic)
      );
    `);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);


  db.run(`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      mode TEXT DEFAULT 'technical',
      question TEXT NOT NULL,
      student_answer TEXT,
      feedback TEXT,
      score INTEGER,
      strengths TEXT,
      gaps TEXT,
      better_answer TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      target_company TEXT,
      plan_json TEXT NOT NULL,
      generated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preppilot_coding_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      language TEXT NOT NULL DEFAULT 'python',
      status TEXT NOT NULL DEFAULT 'solved',
      date_solved TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      file_name TEXT,
      file_type TEXT,
      raw_text TEXT,
      parsed_json TEXT NOT NULL,
      ats_scores TEXT NOT NULL,
      feedback_json TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // ── Activity Timeline Table ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS student_activity (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL,
      event_type  TEXT    NOT NULL,
      description TEXT,
      metadata    TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing databases
  try { db.run('CREATE INDEX IF NOT EXISTS idx_activity_student ON student_activity(student_id, created_at DESC)'); } catch(e) {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_activity_event ON student_activity(event_type, created_at DESC)'); } catch(e) {}

  console.log('✅ Database schema initialized');
  seedStaffAccounts();
}

async function seedStaffAccounts() {
  const bcrypt = require('bcryptjs');
  const staffUsers = [
    { name: 'Admin', email: 'admin@careerforge.ai', pass: 'Admin@123' },
    { name: 'Placement Officer', email: 'placement@careerforge.ai', pass: 'Placement@123' },
    { name: 'HOD', email: 'hod@careerforge.ai', pass: 'HOD@123' },
    { name: 'Faculty Member', email: 'faculty@careerforge.ai', pass: 'Faculty@123' }
  ];

  for (const s of staffUsers) {
    const hashedPassword = bcrypt.hashSync(s.pass, 10);

    // 1. Seed users table
    const existingUser = queryOne('SELECT * FROM users WHERE email = ?', [s.email]);
    if (!existingUser) {
      execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [s.name, s.email, hashedPassword, 'staff']
      );
      console.log(`👤 Seeded staff user: ${s.email}`);
    } else {
      execute(
        'UPDATE users SET role = ? WHERE email = ?',
        ['staff', s.email]
      );
    }

    // 2. Seed students table
    const existingStudent = queryOne('SELECT * FROM students WHERE email = ?', [s.email]);
    if (!existingStudent) {
      execute(
        'INSERT INTO students (name, email, password, role) VALUES (?, ?, ?, ?)',
        [s.name, s.email, hashedPassword, 'staff']
      );
      console.log(`🎓 Seeded staff record in students table: ${s.email}`);
    } else {
      execute(
        'UPDATE students SET role = ?, password = COALESCE(password, ?) WHERE email = ?',
        ['staff', hashedPassword, s.email]
      );
    }
  }

  // Verification log check
  const staffList = queryAll("SELECT email, role FROM students WHERE role = 'staff'");
  console.log('✅ Staff Accounts Verification in students table:', staffList);
}

/**
 * Helper: run a SELECT query and return all rows as objects.
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: run a SELECT query and return the first row as an object (or null).
 */
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run an INSERT/UPDATE/DELETE and return lastInsertRowid + changes.
 */
function execute(sql, params = []) {
  db.run(sql, params);
  const meta = queryOne('SELECT last_insert_rowid() as id, changes() as changes');
  persistDb();
  return {
    lastInsertRowid: meta ? meta.id : null,
    changes: meta ? meta.changes : 0,
  };
}

/**
 * Log a student activity event to the student_activity table.
 * Also broadcasts to SSE clients if the broadcaster is registered.
 */
function logActivity(studentId, eventType, description, metadata = {}) {
  try {
    if (!studentId || !eventType) return;
    execute(
      `INSERT INTO student_activity (student_id, event_type, description, metadata)
       VALUES (?, ?, ?, ?)`,
      [studentId, eventType, description || '', JSON.stringify(metadata)]
    );
    // Broadcast to SSE clients if broadcaster is registered
    if (global.__ssebroadcast) {
      global.__ssebroadcast(eventType, { studentId, description, metadata, ts: new Date().toISOString() });
    }
  } catch (e) {
    console.warn('[logActivity error]', e.message);
  }
}

/**
 * Recalculate all scores for a student from raw activity data.
 * Weights: Resume 25%, Coding 30%, Interview 20%, Projects 15%, Planner 10%
 */
function recalculateStudentScores(studentId) {
  try {
    const student = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) return;

    // Coding Score: weighted by difficulty from preppilot_coding_history
    const codingHistory = queryAll(
      'SELECT difficulty FROM preppilot_coding_history WHERE student_id = ?',
      [studentId]
    );
    let codingPoints = 0;
    for (const entry of codingHistory) {
      const d = (entry.difficulty || 'medium').toLowerCase();
      if (d === 'easy') codingPoints += 1;
      else if (d === 'medium') codingPoints += 2;
      else if (d === 'hard') codingPoints += 4;
      else codingPoints += 2;
    }
    // Normalize: 30 hard problems = 100%
    const codingScore = Math.min(100, Math.round((codingPoints / 120) * 100));

    // Interview Score: average of all session scores
    const sessions = queryAll(
      'SELECT score FROM interview_sessions WHERE student_id = ? AND score IS NOT NULL',
      [studentId]
    );
    const interviewScore = sessions.length > 0
      ? Math.min(100, Math.round(sessions.reduce((s, r) => s + (r.score || 0), 0) / sessions.length))
      : (student.interview_score || 0);

    // Current Streak: consecutive days with activity
    const activityDays = queryAll(
      `SELECT DISTINCT date(created_at) as day FROM student_activity 
       WHERE student_id = ? ORDER BY day DESC LIMIT 30`,
      [studentId]
    );
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < activityDays.length; i++) {
      const dayDate = new Date(activityDays[i].day);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (dayDate.toDateString() === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    // Study Hours: count activity events as 0.5h each (rough estimate)
    const activityCount = queryOne(
      'SELECT COUNT(*) as cnt FROM student_activity WHERE student_id = ?',
      [studentId]
    );
    const studyHours = Math.round((activityCount?.cnt || 0) * 0.5);

    // Planner score: 0 or 100
    const hasPlan = queryOne('SELECT id FROM plans WHERE student_id = ?', [studentId]);
    const plannerScore = hasPlan ? 100 : 0;

    // Resume score from students table (already set by ATS analysis)
    const resumeScore = student.resume_score || 0;
    const problemsSolved = codingHistory.length;

    // Placement Readiness: Resume 25% + Coding 30% + Interview 20% + Projects(approx from resume) 15% + Planner 10%
    const projectsScore = Math.min(100, resumeScore * 0.8); // approximation from resume
    const readiness = Math.round(
      resumeScore * 0.25 +
      codingScore * 0.30 +
      interviewScore * 0.20 +
      projectsScore * 0.15 +
      plannerScore * 0.10
    );

    execute(
      `UPDATE students SET
        coding_score = ?,
        interview_score = ?,
        current_streak = ?,
        study_hours = ?,
        problems_solved = ?,
        placement_readiness = ?,
        profile_completion = MIN(100, 20 + ? + ? + ? + ?)
       WHERE id = ?`,
      [
        codingScore,
        interviewScore,
        streak,
        studyHours,
        problemsSolved,
        readiness,
        (resumeScore > 0 ? 20 : 0),
        (codingScore > 0 ? 15 : 0),
        (interviewScore > 0 ? 15 : 0),
        (hasPlan ? 10 : 0),
        studentId
      ]
    );
    return { codingScore, interviewScore, streak, studyHours, problemsSolved, readiness };
  } catch (e) {
    console.warn('[recalculateStudentScores error]', e.message);
    return null;
  }
}

module.exports = { initDb, queryAll, queryOne, execute, persistDb, logActivity, recalculateStudentScores };
