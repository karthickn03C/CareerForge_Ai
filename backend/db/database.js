/**
 * PostgreSQL Database Layer for CareerForge AI
 * Centralized Connection Pool supporting Neon PostgreSQL & Render Deployment
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    // Check if SSL is required (Neon & Cloud PG require SSL)
    const isProduction = process.env.NODE_ENV === 'production' || (connectionString && connectionString.includes('neon.tech'));
    
    pool = new Pool({
      connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/careerforge',
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

/**
 * Initialize PostgreSQL Database Schema
 */
async function initDb() {
  const client = getPool();

  try {
    // 1. Students Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        firebase_uid VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        photo_url TEXT,
        leetcode_username VARCHAR(255),
        leetcode_total_solved INT DEFAULT 0,
        target_date VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Progress Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS progress_entries (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        topic VARCHAR(255) NOT NULL,
        platform VARCHAR(255) NOT NULL,
        problems_solved INT NOT NULL DEFAULT 0,
        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_student_platform_topic UNIQUE(student_id, platform, topic)
      );
    `);

    // 3. Practice Questions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS practice_questions (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        topic VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Interview Sessions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        mode VARCHAR(50) DEFAULT 'technical',
        question TEXT NOT NULL,
        student_answer TEXT,
        feedback TEXT,
        score INT,
        strengths TEXT,
        gaps TEXT,
        better_answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Plans Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        target_company VARCHAR(255),
        plan_json TEXT NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. PrepPilot Coding History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS preppilot_coding_history (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        difficulty VARCHAR(50) DEFAULT 'medium',
        language VARCHAR(50) DEFAULT 'python',
        status VARCHAR(50) DEFAULT 'solved',
        date_solved TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Resume Analyses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resume_analyses (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        file_type VARCHAR(100),
        raw_text TEXT,
        parsed_json TEXT NOT NULL,
        ats_scores TEXT NOT NULL,
        feedback_json TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. ForgeMind Conversations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS forgemind_conversations (
        id VARCHAR(255) PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        title VARCHAR(255),
        pinned INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. ForgeMind Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS forgemind_messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) REFERENCES forgemind_conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50),
        text TEXT,
        file_name VARCHAR(255),
        agent_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PostgreSQL Schema Initialized Successfully');
  } catch (err) {
    console.error('❌ PostgreSQL Schema Initialization Error:', err.message);
  }
}

/**
 * Execute SQL Query returning all rows
 */
async function queryAll(text, params = []) {
  const client = getPool();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } catch (err) {
    console.error(`[PG QueryAll Error] ${text}:`, err.message);
    return [];
  }
}

/**
 * Execute SQL Query returning single row
 */
async function queryOne(text, params = []) {
  const client = getPool();
  try {
    const res = await client.query(text, params);
    return res.rows[0] || null;
  } catch (err) {
    console.error(`[PG QueryOne Error] ${text}:`, err.message);
    return null;
  }
}

/**
 * Execute INSERT/UPDATE/DELETE query
 */
async function execute(text, params = []) {
  const client = getPool();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error(`[PG Execute Error] ${text}:`, err.message);
    throw err;
  }
}

module.exports = {
  initDb,
  queryAll,
  queryOne,
  execute,
  getPool
};
