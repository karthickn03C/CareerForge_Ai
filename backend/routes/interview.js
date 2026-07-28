const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db/database');
const { askQuestion, evaluateAnswer } = require('../agents/interviewAgent');
const { getWeakestTopic } = require('../agents/progressAgent');

// GET all interview sessions for a student
router.get('/:studentId', (req, res) => {
  const sessions = queryAll(
    'SELECT * FROM interview_sessions WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.studentId]
  );
  const parsed = sessions.map((s) => ({
    ...s,
    strengths: s.strengths ? JSON.parse(s.strengths) : [],
    gaps: s.gaps ? JSON.parse(s.gaps) : [],
  }));
  res.json(parsed);
});

// POST start a new interview session
router.post('/:studentId/start', async (req, res) => {
  const { topic, mode, difficulty } = req.body;
  let targetTopic = topic;
  const targetDifficulty = difficulty || 'intermediate';

  if (!targetTopic && mode !== 'hr') {
    const entries = queryAll(
      'SELECT * FROM progress_entries WHERE student_id = ?',
      [req.params.studentId]
    );
    const weakest = getWeakestTopic(entries);
    targetTopic = weakest ? weakest.topic : 'Data Structures';
  }

  try {
    const result = await askQuestion(targetTopic || 'General', mode || 'technical', targetDifficulty);

    const inserted = execute(
      `INSERT INTO interview_sessions (student_id, mode, question) VALUES (?, ?, ?)`,
      [req.params.studentId, mode || 'technical', result.question]
    );

    res.status(201).json({
      id: inserted.lastInsertRowid,
      student_id: parseInt(req.params.studentId),
      topic: targetTopic,
      mode: mode || 'technical',
      difficulty: targetDifficulty,
      question: result.question,
    });
  } catch (err) {
    console.error('Interview start error:', err.message);
    res.status(500).json({ error: `Failed to start interview: ${err.message}` });
  }
});

// POST submit answer and get evaluation
router.post('/session/:sessionId/answer', async (req, res) => {
  const { student_answer, topic, difficulty } = req.body;
  if (!student_answer) return res.status(400).json({ error: 'student_answer is required' });

  const session = queryOne(
    'SELECT * FROM interview_sessions WHERE id = ?',
    [req.params.sessionId]
  );
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const evaluation = await evaluateAnswer(
      session.question,
      student_answer,
      topic || 'General',
      session.mode,
      difficulty || 'intermediate'
    );

    execute(
      `UPDATE interview_sessions SET student_answer = ?, score = ?, strengths = ?, gaps = ?, better_answer = ? WHERE id = ?`,
      [
        student_answer,
        evaluation.score,
        JSON.stringify(evaluation.strengths || []),
        JSON.stringify(evaluation.gaps || []),
        evaluation.betterAnswer || '',
        req.params.sessionId,
      ]
    );

    const updated = queryOne(
      'SELECT * FROM interview_sessions WHERE id = ?',
      [req.params.sessionId]
    );

    res.json({
      ...updated,
      evaluation,
      strengths: JSON.parse(updated.strengths || '[]'),
      gaps: JSON.parse(updated.gaps || '[]'),
    });
  } catch (err) {
    console.error('Interview evaluation error:', err.message);
    res.status(500).json({ error: `Failed to evaluate answer: ${err.message}` });
  }
});

// DELETE interview session
router.delete('/session/:sessionId', (req, res) => {
  execute('DELETE FROM interview_sessions WHERE id = ?', [req.params.sessionId]);
  res.json({ message: 'Session deleted' });
});

module.exports = router;
