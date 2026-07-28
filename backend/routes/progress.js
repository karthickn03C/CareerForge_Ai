const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { queryAll, queryOne, execute } = require('../db/database');
const { analyzeProgress } = require('../agents/progressAgent');

// GET all progress entries for a student with analysis + verified totalSolved
router.get('/:studentId', (req, res) => {
  const { studentId } = req.params;

  const entries = queryAll(
    'SELECT * FROM progress_entries WHERE student_id = ? ORDER BY date_added DESC',
    [studentId]
  );

  const analysis = analyzeProgress(entries);

  // FIX 1: Use the verified LeetCode total stored on the student record.
  // Never calculate "total solved" by summing per-topic entries — that always inflates.
  const student = queryOne('SELECT leetcode_total_solved FROM students WHERE id = ?', [studentId]);
  const totalSolved = student?.leetcode_total_solved || 0;

  res.json({ entries, analysis, totalSolved });
});

// POST add a progress entry manually (non-LeetCode, always additive)
router.post('/:studentId', (req, res) => {
  const { topic, platform, problems_solved } = req.body;
  if (!topic || !platform || problems_solved === undefined) {
    return res.status(400).json({ error: 'topic, platform, and problems_solved are required' });
  }

  // Manual entries: plain INSERT (allow duplicates per the spec — user can add multiple manual entries for the same topic)
  const result = execute(
    'INSERT INTO progress_entries (student_id, topic, platform, problems_solved) VALUES (?, ?, ?, ?)',
    [req.params.studentId, topic, platform, parseInt(problems_solved)]
  );

  const entry = queryOne('SELECT * FROM progress_entries WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(entry);
});

// DELETE a progress entry
router.delete('/entry/:id', (req, res) => {
  execute('DELETE FROM progress_entries WHERE id = ?', [req.params.id]);
  res.json({ message: 'Entry deleted' });
});

// ── Core LeetCode Fetch & Save ────────────────────────────────────────────────
/**
 * Fetches real LeetCode stats (total + per-tag) for a username and saves them.
 * FIX 2: Uses tagProblemCounts for real per-topic data (not fabricated).
 * FIX 3: Uses INSERT OR REPLACE (upsert) keyed on (student_id, platform, topic) — no duplicates ever.
 * FIX 1: Saves allEntry.count into students.leetcode_total_solved for accurate "Total Solved" display.
 */
async function fetchAndSaveLeetCodeStats(studentId, username) {
  const query = `
    query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        tagProblemCounts {
          advanced   { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental  { tagName tagSlug problemsSolved }
        }
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!response.ok) throw new Error(`LeetCode API returned HTTP ${response.status}`);

  const data = await response.json();
  if (!data.data?.matchedUser) {
    throw new Error(`LeetCode user "${username}" not found`);
  }

  const { submitStats, tagProblemCounts } = data.data.matchedUser;
  const acSubmissionNum = submitStats?.acSubmissionNum || [];

  // ── FIX 1: Extract VERIFIED total from acSubmissionNum "All" ──────────────
  const allEntry    = acSubmissionNum.find(e => e.difficulty === 'All')    || { count: 0, submissions: 0 };
  const easyEntry   = acSubmissionNum.find(e => e.difficulty === 'Easy')   || { count: 0 };
  const mediumEntry = acSubmissionNum.find(e => e.difficulty === 'Medium') || { count: 0 };
  const hardEntry   = acSubmissionNum.find(e => e.difficulty === 'Hard')   || { count: 0 };

  const verifiedTotal = allEntry.count; // This is the true "problems solved" number

  console.log(`[LeetCode Sync] @${username} | Verified Total: ${verifiedTotal} | Easy: ${easyEntry.count} | Medium: ${mediumEntry.count} | Hard: ${hardEntry.count}`);

  // ── Save username + verified total on the student record ──────────────────
  execute(
    'UPDATE students SET leetcode_username = ?, leetcode_total_solved = ? WHERE id = ?',
    [username, verifiedTotal, studentId]
  );

  // ── FIX 3: Upsert (INSERT OR REPLACE) all LeetCode tag entries ────────────
  // This guarantees no duplicate rows on repeated Refresh Stats clicks.
  // Keyed on UNIQUE(student_id, platform, topic).

  // DSA-relevant tags to include in the chart (filter noise)
  const DSA_TOPICS = new Set([
    'Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math',
    'Sorting', 'Greedy', 'Depth-First Search', 'Binary Search',
    'Breadth-First Search', 'Tree', 'Matrix', 'Two Pointers',
    'Bit Manipulation', 'Heap (Priority Queue)', 'Stack', 'Graph',
    'Sliding Window', 'Linked List', 'Recursion', 'Backtracking',
    'Queue', 'Binary Tree', 'Binary Search Tree', 'Divide and Conquer',
    'Trie', 'Segment Tree', 'Union Find', 'Monotonic Stack',
    'Prefix Sum', 'Simulation', 'Counting',
  ]);

  // ── FIX 2: Use REAL tagProblemCounts data ────────────────────────────────
  const allTags = [
    ...(tagProblemCounts?.fundamental   || []),
    ...(tagProblemCounts?.intermediate  || []),
    ...(tagProblemCounts?.advanced      || []),
  ];

  const importedTopics = [];

  for (const tag of allTags) {
    if (tag.problemsSolved > 0 && DSA_TOPICS.has(tag.tagName)) {
      // INSERT OR REPLACE: if (student_id, 'LeetCode', tagName) already exists → update count
      execute(
        `INSERT INTO progress_entries (student_id, topic, platform, problems_solved)
         VALUES (?, ?, 'LeetCode', ?)
         ON CONFLICT(student_id, platform, topic)
         DO UPDATE SET problems_solved = excluded.problems_solved, date_added = datetime('now')`,
        [studentId, tag.tagName, tag.problemsSolved]
      );
      importedTopics.push({ topic: tag.tagName, count: tag.problemsSolved });
    }
  }

  // Also upsert the difficulty-level entries (Easy/Medium/Hard Problems)
  const difficultyRows = [
    { topic: 'Easy Problems',   count: easyEntry.count },
    { topic: 'Medium Problems', count: mediumEntry.count },
    { topic: 'Hard Problems',   count: hardEntry.count },
  ];
  for (const { topic, count } of difficultyRows) {
    if (count > 0) {
      execute(
        `INSERT INTO progress_entries (student_id, topic, platform, problems_solved)
         VALUES (?, ?, 'LeetCode', ?)
         ON CONFLICT(student_id, platform, topic)
         DO UPDATE SET problems_solved = excluded.problems_solved, date_added = datetime('now')`,
        [studentId, topic, count]
      );
    }
  }

  console.log(`[LeetCode Sync] Upserted ${importedTopics.length} DSA topic entries for @${username}`);

  return {
    totalSolved: verifiedTotal,
    submissions: allEntry.submissions,
    breakdown: { easy: easyEntry.count, medium: mediumEntry.count, hard: hardEntry.count },
    username,
    importedTopicsCount: importedTopics.length,
  };
}

// POST auto-import from LeetCode public GraphQL API
router.post('/:studentId/import-leetcode', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    const stats = await fetchAndSaveLeetCodeStats(req.params.studentId, username.trim());
    res.json({
      message: `Successfully synced LeetCode profile @${stats.username} — ${stats.totalSolved} problems solved (Easy: ${stats.breakdown.easy}, Medium: ${stats.breakdown.medium}, Hard: ${stats.breakdown.hard})`,
      stats,
    });
  } catch (err) {
    console.error('LeetCode import error:', err.message);
    res.status(500).json({ error: `Failed to import from LeetCode: ${err.message}` });
  }
});

// POST refresh stats using saved LeetCode username
router.post('/:studentId/refresh-leetcode', async (req, res) => {
  const student = queryOne('SELECT * FROM students WHERE id = ?', [req.params.studentId]);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (!student.leetcode_username) {
    return res.status(400).json({ error: 'No saved LeetCode username. Please enter your username first.' });
  }

  try {
    const stats = await fetchAndSaveLeetCodeStats(student.id, student.leetcode_username);
    res.json({
      message: `Refreshed LeetCode stats for @${stats.username} — ${stats.totalSolved} problems solved`,
      stats,
    });
  } catch (err) {
    console.error('LeetCode refresh error:', err.message);
    res.status(500).json({ error: `Failed to refresh LeetCode stats: ${err.message}` });
  }
});

// POST unlink LeetCode account for a student
router.post('/:studentId/unlink-leetcode', (req, res) => {
  const { studentId } = req.params;
  execute(
    'UPDATE students SET leetcode_username = NULL, leetcode_total_solved = 0 WHERE id = ?',
    [studentId]
  );
  execute(
    `DELETE FROM progress_entries WHERE student_id = ? AND platform = 'LeetCode'`,
    [studentId]
  );
  res.json({ message: 'Successfully unlinked LeetCode account' });
});

module.exports = router;
