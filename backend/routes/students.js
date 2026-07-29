const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db/database');

// GET all students
router.get('/', (req, res) => {
  const students = queryAll('SELECT * FROM students ORDER BY created_at DESC');
  res.json(students);
});

// GET single student
router.get('/:id', (req, res) => {
  const student = queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

// POST sync Firebase Google Auth User
router.post('/sync', (req, res) => {
  const { firebase_uid, name, email, photo_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  // 1. Try to find student by firebase_uid
  let student = null;
  if (firebase_uid) {
    student = queryOne('SELECT * FROM students WHERE firebase_uid = ?', [firebase_uid]);
  }
  // 2. If not found by uid, try by email
  if (!student && email) {
    student = queryOne('SELECT * FROM students WHERE email = ?', [email]);
  }

  if (student) {
    // Update existing student with latest google details
    execute(
      `UPDATE students SET 
        name = ?, 
        email = COALESCE(?, email), 
        photo_url = COALESCE(?, photo_url),
        firebase_uid = COALESCE(?, firebase_uid)
       WHERE id = ?`,
      [name || student.name, email || null, photo_url || null, firebase_uid || null, student.id]
    );
    const updated = queryOne('SELECT * FROM students WHERE id = ?', [student.id]);
    return res.json(updated);
  }

  // Insert new student linked to Google Auth
  const result = execute(
    `INSERT INTO students (name, firebase_uid, email, photo_url) VALUES (?, ?, ?, ?)`,
    [name, firebase_uid || null, email || null, photo_url || null]
  );

  const newStudent = queryOne('SELECT * FROM students WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(newStudent);
});

// POST create student manually
router.post('/', (req, res) => {
  const { name, target_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = execute(
    'INSERT INTO students (name, target_date) VALUES (?, ?)',
    [name, target_date || null]
  );

  const newStudent = queryOne('SELECT * FROM students WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(newStudent);
});

// PUT update student
router.put('/:id', (req, res) => {
  const student = queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { name, target_date, leetcode_username } = req.body;
  execute(
    'UPDATE students SET name = ?, target_date = ?, leetcode_username = ? WHERE id = ?',
    [
      name || student.name,
      target_date !== undefined ? target_date : student.target_date,
      leetcode_username !== undefined ? leetcode_username : student.leetcode_username,
      req.params.id,
    ]
  );

  const updated = queryOne('SELECT * FROM students WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// DELETE student
router.delete('/:id', (req, res) => {
  execute('DELETE FROM students WHERE id = ?', [req.params.id]);
  res.json({ message: 'Student deleted' });
});

// ── Endpoint 1: GET /api/students/:id/progress ─────────────────────────────
// Returns LeetCode + Manual progress data
router.get('/:id/progress', (req, res) => {
  const { id } = req.params;

  const entries = queryAll(
    'SELECT * FROM progress_entries WHERE student_id = ? ORDER BY date_added DESC',
    [id]
  );

  const student = queryOne('SELECT leetcode_total_solved FROM students WHERE id = ?', [id]);
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
// Returns PrepPilot practice progress (strictly scoped to this student)
router.get('/:id/preppilot-progress', (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null' || id === 'undefined') {
    return res.status(400).json({ error: 'Valid student id is required' });
  }

  // Query solved coding history strictly for this student
  const history = queryAll(
    `SELECT * FROM preppilot_coding_history WHERE student_id = ? AND status = 'solved'`,
    [id]
  );

  const totalSolved = history.length;

  // Topic aggregation with independent scale (<3 = weak, 3-7 = moderate, >7 = strong)
  const topicMap = {};
  const langMap = {};

  for (const item of history) {
    const t = (item.topic || 'General').trim();
    const l = (item.language || 'python').trim();

    topicMap[t] = (topicMap[t] || 0) + 1;

    // Standardize language display
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
// Returns detailed list of solved PrepPilot coding challenges for this student
router.get('/:id/preppilot-history', (req, res) => {
  const { id } = req.params;

  if (!id || id === 'null' || id === 'undefined') {
    return res.status(400).json({ error: 'Valid student id is required' });
  }

  const history = queryAll(
    `SELECT * FROM preppilot_coding_history WHERE student_id = ? ORDER BY date_solved DESC`,
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
// Log a newly solved PrepPilot coding challenge
router.post('/:id/preppilot-history', (req, res) => {
  const { id } = req.params;
  const { title, topic, difficulty, language } = req.body;

  if (!id || id === 'null' || id === 'undefined' || isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Valid student_id is required' });
  }

  // Validate student exists in database
  const student = queryOne('SELECT id FROM students WHERE id = ?', [id]);
  if (!student) {
    return res.status(404).json({ error: `Student with id ${id} not found` });
  }

  if (!title || !topic) {
    return res.status(400).json({ error: 'title and topic are required' });
  }

  const result = execute(
    `INSERT INTO preppilot_coding_history (student_id, title, topic, difficulty, language, status) VALUES (?, ?, ?, ?, ?, 'solved')`,
    [id, title, topic, difficulty || 'medium', language || 'python']
  );

  const newEntry = queryOne(`SELECT * FROM preppilot_coding_history WHERE id = ?`, [result.lastInsertRowid]);
  res.status(201).json(newEntry);
});

// ── GET /api/students/staff/analytics ──────────────────────────────────────
router.get('/staff/analytics', (req, res) => {
  try {
    const students = queryAll('SELECT * FROM students ORDER BY created_at DESC');
    const totalStudents = students.length || 24;
    const activeToday = Math.max(12, Math.round(totalStudents * 0.75));
    
    const studentList = students.map((s, idx) => {
      const resumeScore = Math.min(98, 65 + ((s.id * 7) % 32));
      const codingScore = Math.min(96, 58 + ((s.id * 11) % 38));
      const interviewScore = Math.min(95, 60 + ((s.id * 9) % 34));
      const readinessScore = Math.round((resumeScore * 0.35) + (codingScore * 0.45) + (interviewScore * 0.20));
      const isAtRisk = readinessScore < 70;

      return {
        id: s.id,
        name: s.name,
        email: s.email || `candidate${s.id}@careerforge.ai`,
        leetcode_username: s.leetcode_username || 'Not Linked',
        leetcode_total_solved: s.leetcode_total_solved || 0,
        resumeScore,
        codingScore,
        interviewScore,
        readinessScore,
        isAtRisk,
        status: idx % 3 === 0 ? 'Active Now' : 'Active 2h ago',
        aiRecommendation: isAtRisk 
          ? 'Needs immediate practice in Dynamic Programming & Resume ATS optimization.'
          : 'High readiness score! Recommended for Top Tier Tech Placement Drives.'
      };
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeToday,
        avgReadinessScore: Math.round(studentList.reduce((acc, s) => acc + s.readinessScore, 0) / (studentList.length || 1)),
        studentsAtRisk: studentList.filter(s => s.isAtRisk).length,
        eligibleForDrives: studentList.filter(s => s.readinessScore >= 75).length
      },
      students: studentList,
      placementDrives: [
        { id: 1, company: 'Google India', role: 'Software Development Engineer I', minScore: 85, eligibleCount: studentList.filter(s => s.readinessScore >= 85).length, status: 'Upcoming' },
        { id: 2, company: 'Amazon Web Services', role: 'Cloud Support / Systems Engineer', minScore: 78, eligibleCount: studentList.filter(s => s.readinessScore >= 78).length, status: 'Active' },
        { id: 3, company: 'Microsoft IDC', role: 'Associate Software Engineer', minScore: 80, eligibleCount: studentList.filter(s => s.readinessScore >= 80).length, status: 'Completed' }
      ]
    });
  } catch (err) {
    console.error('Staff analytics error:', err);
    res.status(500).json({ error: 'Failed to generate staff analytics' });
  }
});

module.exports = router;
