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

module.exports = { initDb, queryAll, queryOne, execute, persistDb };
