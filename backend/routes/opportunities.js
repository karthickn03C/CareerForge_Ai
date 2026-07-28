const express = require('express');
const router = express.Router();
const { discoverOpportunities } = require('../agents/opportunityAgent');
const { queryAll, queryOne, execute } = require('../db/database');

// GET saved opportunities for a student
router.get('/:studentId/saved', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const rows = await queryAll('SELECT * FROM saved_opportunities WHERE student_id = $1 ORDER BY saved_at DESC', [studentId]);
    const parsed = rows.map(r => ({
      ...r,
      skillsRequired: r.skills_required ? (typeof r.skills_required === 'string' ? JSON.parse(r.skills_required) : r.skills_required) : [],
      isPaid: Boolean(r.is_paid),
      isRemote: Boolean(r.is_remote),
    }));
    res.json(parsed);
  } catch (err) {
    res.json([]);
  }
});

// POST toggle bookmark / save opportunity
router.post('/:studentId/save', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const opp = req.body;

    await execute(`
      CREATE TABLE IF NOT EXISTS saved_opportunities (
        id VARCHAR(255) PRIMARY KEY,
        student_id INT,
        title VARCHAR(255),
        platform VARCHAR(255),
        category VARCHAR(255),
        deadline VARCHAR(255),
        difficulty VARCHAR(100),
        match_percentage INT,
        reason_recommended TEXT,
        skills_required TEXT,
        apply_url TEXT,
        is_paid INT,
        is_remote INT,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existing = await queryOne('SELECT * FROM saved_opportunities WHERE id = $1 AND student_id = $2', [opp.id, studentId]);

    if (existing) {
      await execute('DELETE FROM saved_opportunities WHERE id = $1 AND student_id = $2', [opp.id, studentId]);
      return res.json({ saved: false, message: 'Removed from saved opportunities' });
    } else {
      await execute(`
        INSERT INTO saved_opportunities (
          id, student_id, title, platform, category, deadline, difficulty,
          match_percentage, reason_recommended, skills_required, apply_url, is_paid, is_remote
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
