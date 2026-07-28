const express = require('express');
const router = express.Router();
const { discoverOpportunities } = require('../agents/opportunityAgent');
const { queryAll, queryOne, execute } = require('../db/database');

// GET saved opportunities for a student
router.get('/:studentId/saved', (req, res) => {
  try {
    const studentId = req.params.studentId;
    const rows = queryAll('SELECT * FROM saved_opportunities WHERE student_id = ? ORDER BY saved_at DESC', [studentId]);
    const parsed = rows.map(r => ({
      ...r,
      skillsRequired: r.skills_required ? JSON.parse(r.skills_required) : [],
      isPaid: Boolean(r.is_paid),
      isRemote: Boolean(r.is_remote),
    }));
    res.json(parsed);
  } catch (err) {
    // If table doesn't exist yet, return empty list gracefully
    res.json([]);
  }
});

// POST toggle bookmark / save opportunity
router.post('/:studentId/save', (req, res) => {
  try {
    const studentId = req.params.studentId;
    const opp = req.body;

    // Check if table exists, create if not
    execute(`
      CREATE TABLE IF NOT EXISTS saved_opportunities (
        id TEXT PRIMARY KEY,
        student_id INTEGER,
        title TEXT,
        platform TEXT,
        category TEXT,
        deadline TEXT,
        difficulty TEXT,
        match_percentage INTEGER,
        reason_recommended TEXT,
        skills_required TEXT,
        apply_url TEXT,
        is_paid INTEGER,
        is_remote INTEGER,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existing = queryOne('SELECT * FROM saved_opportunities WHERE id = ? AND student_id = ?', [opp.id, studentId]);

    if (existing) {
      execute('DELETE FROM saved_opportunities WHERE id = ? AND student_id = ?', [opp.id, studentId]);
      return res.json({ saved: false, message: 'Removed from saved opportunities' });
    } else {
      execute(`
        INSERT INTO saved_opportunities (
          id, student_id, title, platform, category, deadline, difficulty,
          match_percentage, reason_recommended, skills_required, apply_url, is_paid, is_remote
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        opp.id || `opp_${Date.now()}`,
        studentId,
        opp.title,
        opp.platform,
        opp.category,
        opp.deadline,
        opp.difficulty,
        opp.matchPercentage || 90,
        opp.reasonRecommended || '',
        JSON.stringify(opp.skillsRequired || []),
        opp.applyUrl || '#',
        opp.isPaid ? 1 : 0,
        opp.isRemote ? 1 : 0,
      ]);
      return res.json({ saved: true, message: 'Saved opportunity successfully' });
    }
  } catch (err) {
    console.error('Save opportunity error:', err.message);
    res.status(500).json({ error: `Failed to save opportunity: ${err.message}` });
  }
});

// POST generate AI recommended opportunities
router.post('/:studentId/discover', async (req, res) => {
  try {
    const profile = req.body || {};
    const result = await discoverOpportunities(profile);
    res.json(result);
  } catch (err) {
    console.error('Opportunity discovery error:', err.message);
    res.status(500).json({ error: `Failed to discover opportunities: ${err.message}` });
  }
});

module.exports = router;
