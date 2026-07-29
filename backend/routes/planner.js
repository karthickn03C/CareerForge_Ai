const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db/database');
const { generatePlan } = require('../agents/plannerAgent');
const { getWeakAndModerateTopics } = require('../agents/progressAgent');

// GET latest plan for a student
router.get('/:studentId', (req, res) => {
  const plan = queryOne(
    'SELECT * FROM plans WHERE student_id = ? ORDER BY generated_at DESC LIMIT 1',
    [req.params.studentId]
  );
  if (!plan) return res.json(null);
  res.json({
    ...plan,
    target_company: plan.target_company || '',
    plan_json: JSON.parse(plan.plan_json)
  });
});

// POST generate a new plan
router.post('/:studentId/generate', async (req, res) => {
  const { target_date, targetCompany, target_company } = req.body;
  const company = (targetCompany || target_company || '').trim();

  const student = queryOne('SELECT * FROM students WHERE id = ?', [req.params.studentId]);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const resolvedDate = target_date || student.target_date;
  if (!resolvedDate) {
    return res.status(400).json({
      error: 'target_date is required. Provide it in the request or update the student record.',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const placement = new Date(resolvedDate);
  placement.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((placement - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return res.status(400).json({ error: 'target_date must be in the future' });
  }

  const entries = queryAll(
    'SELECT * FROM progress_entries WHERE student_id = ?',
    [req.params.studentId]
  );
  const weakTopics = getWeakAndModerateTopics(entries);

  if (weakTopics.length === 0) {
    return res.status(400).json({
      error: 'No weak or moderate topics found. Add progress entries first.',
    });
  }

  try {
    const planData = await generatePlan(weakTopics, daysRemaining, company);

    const result = execute(
      'INSERT INTO plans (student_id, target_company, plan_json) VALUES (?, ?, ?)',
      [req.params.studentId, company || null, JSON.stringify(planData)]
    );

    // Update real-time student planner metrics in PostgreSQL
    execute(
      `UPDATE students SET 
        planner_completed = 1, 
        profile_completion = MIN(100, profile_completion + 20),
        status = 'Active Now'
       WHERE id = ?`,
      [req.params.studentId]
    );

    if (target_date) {
      execute('UPDATE students SET target_date = ? WHERE id = ?', [target_date, req.params.studentId]);
    }

    const saved = queryOne('SELECT * FROM plans WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({
      ...saved,
      target_company: saved.target_company || company,
      plan_json: JSON.parse(saved.plan_json),
      daysRemaining,
    });
  } catch (err) {
    console.error('Plan generation error:', err.message);
    res.status(500).json({ error: `Failed to generate plan: ${err.message}` });
  }
});

module.exports = router;
