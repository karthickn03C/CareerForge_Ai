const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db/database');
const { askQuestion, evaluateAnswer } = require('../agents/interviewAgent');
const { getWeakestTopic } = require('../agents/progressAgent');

// GET all interview sessions for a student
router.get('/:studentId', async (req, res) => {
  const sessions = await queryAll(
    'SELECT * FROM interview_sessions WHERE student_id = $1 ORDER BY created_at DESC',
    [req.params.studentId]
  );
  const parsed = sessions.map((s) => ({
    ...s,
    strengths: typeof s.strengths === 'string' ? JSON.parse(s.strengths || '[]') : s.strengths || [],
    gaps: typeof s.gaps === 'string' ? JSON.parse(s.gaps || '[]') : s.gaps || [],
  }));
  res.json(parsed);
});

// POST start a new interview session
router.post('/:studentId/start', async (req, res) => {
  const { topic, mode, difficulty } = req.body;
  let targetTopic = topic;
  const targetDifficulty = difficulty || 'intermediate';

  if (!targetTopic && mode !== 'hr') {
    const entries = await queryAll(
      'SELECT * FROM progress_entries WHERE student_id = $1',
      [req.params.studentId]
    );
    const weakest = getWeakestTopic(entries);
    targetTopic = weakest ? weakest.topic : 'Data Structures';
  }

  try {
    const result = await askQuestion(targetTopic || 'General', mode || 'technical', targetDifficulty);

    const inserted = await queryOne(
      `INSERT INTO interview_sessions (student_id, mode, question) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.studentId, mode || 'technical', result.question]
    );

    res.status(201).json({
      id: inserted.id,
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

  const session = await queryOne(
    'SELECT * FROM interview_sessions WHERE id = $1',
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

    await execute(
      `UPDATE interview_sessions SET student_answer = $1, score = $2, strengths = $3, gaps = $4, better_answer = $5 WHERE id = $6`,
      [
        student_answer,
        evaluation.score,
        JSON.stringify(evaluation.strengths || []),
        JSON.stringify(evaluation.gaps || []),
        evaluation.betterAnswer || '',
        req.params.sessionId,
      ]
    );

    const updated = await queryOne(
      'SELECT * FROM interview_sessions WHERE id = $1',
      [req.params.sessionId]
    );

    res.json({
      ...updated,
      evaluation,
      strengths: typeof updated.strengths === 'string' ? JSON.parse(updated.strengths || '[]') : updated.strengths || [],
      gaps: typeof updated.gaps === 'string' ? JSON.parse(updated.gaps || '[]') : updated.gaps || [],
    });
  } catch (err) {
    console.error('Interview answer error:', err.message);
    res.status(500).json({ error: `Failed to evaluate answer: ${err.message}` });
  }
});

module.exports = router;
