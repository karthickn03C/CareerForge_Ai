const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db/database');

// GET all students
router.get('/', async (req, res) => {
  const students = await queryAll('SELECT * FROM students ORDER BY created_at DESC');
  res.json(students);
});

// GET single student
router.get('/:id', async (req, res) => {
  const student = await queryOne('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST sync Firebase Google Auth User
router.post('/sync', async (req, res) => {
  const { firebase_uid, name, email, photo_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  // 1. Try to find student by firebase_uid
  let student = null;
  if (firebase_uid) {
    student = await queryOne('SELECT * FROM students WHERE firebase_uid = $1', [firebase_uid]);
  }
  // 2. If not found by uid, try by email
  if (!student && email) {
    student = await queryOne('SELECT * FROM students WHERE email = $1', [email]);
  }

  if (student) {
    // Update existing student with latest google details
    await execute(
      `UPDATE students SET 
        name = $1, 
        email = COALESCE($2, email), 
        photo_url = COALESCE($3, photo_url),
        firebase_uid = COALESCE($4, firebase_uid)
       WHERE id = $5`,
      [name || student.name, email || null, photo_url || null, firebase_uid || null, student.id]
    );
    const updated = await queryOne('SELECT * FROM students WHERE id = $1', [student.id]);
    return res.json(updated);
  }

  // Insert new student linked to Google Auth
  const result = await queryOne(
    `INSERT INTO students (name, firebase_uid, email, photo_url) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, firebase_uid || null, email || null, photo_url || null]
  );

  res.status(201).json(result);
});

// POST create student manually
router.post('/', async (req, res) => {
  const { name, target_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = await queryOne(
    'INSERT INTO students (name, target_date) VALUES ($1, $2) RETURNING *',
    [name, target_date || null]
  );

  res.status(201).json(result);
});

// PUT update student
router.put('/:id', async (req, res) => {
  const student = await queryOne('SELECT * FROM students WHERE id = $1', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { name, target_date, leetcode_username } = req.body;
  await execute(
    'UPDATE students SET name = $1, target_date = $2, leetcode_username = $3 WHERE id = $4',
    [
      name || student.name,
      target_date !== undefined ? target_date : student.target_date,
      leetcode_username !== undefined ? leetcode_username : student.leetcode_username,
      req.params.id,
    ]
  );

  const updated = await queryOne('SELECT * FROM students WHERE id = $1', [req.params.id]);
  res.json(updated);
});

// DELETE student
router.delete('/:id', async (req, res) => {
  await execute('DELETE FROM students WHERE id = $1', [req.params.id]);
  res.json({ message: 'Student deleted' });
});

// ── Endpoint 1: GET /api/students/:id/progress ─────────────────────────────
router.get('/:id/progress', async (req, res) => {
  const { id } = req.params;

  const entries = await queryAll(
    'SELECT * FROM progress_entries WHERE student_id = $1 ORDER BY date_added DESC',
    [id]
  );

  const student = await queryOne('SELECT leetcode_total_solved FROM students WHERE id = $1', [id]);
  const totalSolved = student?.leetcode_total_solved || 0;

  // Group entries by topic
  const topicMap = {};
  for (const entry of entries) {
    const t = entry.topic.trim();
    topicMap[t] = (topicMap[t] || 0) + entry.problems_solved;
  }

  const topics = Object.entries(topicMap).map(([topic, problemsSolved]) => {
    let status = 'weak';
    if (problemsSolved >= 10 && problemsSolved <= 25) status = 'moderate';
    if (problemsSolved > 25) status = 'strong';
    return { topic, problemsSolved, status };
  });

  res.json({ totalSolved, topics, entries });
});

// ── Endpoint 2: GET /api/students/:id/preppilot-progress ───────────────────
router.get('/:id/preppilot-progress', async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null' || id === 'undefined') {
    return res.status(400).json({ error: 'Valid student id is required' });
  }

  const history = await queryAll(
    `SELECT * FROM preppilot_coding_history WHERE student_id = $1 AND status = 'solved'`,
    [id]
  );

  const totalSolved = history.length;
  const topicMap = {};
  const langMap = {};

  for (const item of history) {
    const t = (item.topic || 'General').trim();
    const l = (item.language || 'python').trim();

    topicMap[t] = (topicMap[t] || 0) + 1;

    const formattedLang = l === 'cpp' || l === 'c++' ? 'C++' :
      l === 'python' || l === 'py' ? 'Python' :
      l === 'java' ? 'Java' :
      l === 'javascript' || l === 'js' ? 'JavaScript' :
      l.charAt(0).toUpperCase() + l.slice(1);

    langMap[formattedLang] = (langMap[formattedLang] || 0) + 1;
  }

  const topics = Object.entries(topicMap).map(([topic, problemsSolved]) => {
    let status = 'weak';
    if (problemsSolved >= 3 && problemsSolved <= 7) status = 'moderate';
    if (problemsSolved > 7) status = 'strong';
    return { topic, problemsSolved, status };
  });

  const languages = Object.entries(langMap).map(([language, problemsSolved]) => ({
    language,
    problemsSolved,
  }));

  res.json({ totalSolved, topics, languages });
});

// ── Endpoint 3: GET /api/students/:id/preppilot-history ────────────────────
router.get('/:id/preppilot-history', async (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null' || id === 'undefined') {
    return res.status(400).json({ error: 'Valid student id is required' });
  }

  const history = await queryAll(
    `SELECT * FROM preppilot_coding_history WHERE student_id = $1 ORDER BY date_solved DESC`,
    [id]
  );

  const formatted = history.map(item => ({
    id: item.id,
    title: item.title,
    topic: item.topic,
    difficulty: item.difficulty || 'medium',
    language: item.language || 'python',
    date_solved: item.date_solved || new Date().toISOString(),
  }));

  res.json(formatted);
});

// ── POST /api/students/:id/preppilot-history ───────────────────────────────
router.post('/:id/preppilot-history', async (req, res) => {
  const { id } = req.params;
  const { title, topic, difficulty, language } = req.body;

  if (!id || id === 'null' || id === 'undefined' || isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Valid student_id is required' });
  }

  const student = await queryOne('SELECT id FROM students WHERE id = $1', [id]);
  if (!student) {
    return res.status(404).json({ error: `Student with id ${id} not found` });
  }

  if (!title || !topic) {
    return res.status(400).json({ error: 'title and topic are required' });
  }

  const newEntry = await queryOne(
    `INSERT INTO preppilot_coding_history (student_id, title, topic, difficulty, language, status) VALUES ($1, $2, $3, $4, $5, 'solved') RETURNING *`,
    [id, title, topic, difficulty || 'medium', language || 'python']
  );

  res.status(201).json(newEntry);
});

module.exports = router;
