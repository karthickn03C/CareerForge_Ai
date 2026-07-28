/**
 * Agent 1: Progress Agent
 * Pure calculation — no LLM call.
 * Analyzes progress_entries by topic and classifies each as weak/moderate/strong.
 */

const THRESHOLDS = {
  weak: 10,      // < 10 problems → weak
  moderate: 25,  // 10–25 problems → moderate
               // > 25 problems → strong
};

/**
 * Classify a problem count into a strength status.
 */
function classifyStatus(count) {
  if (count < THRESHOLDS.weak) return 'weak';
  if (count <= THRESHOLDS.moderate) return 'moderate';
  return 'strong';
}

/**
 * Aggregate progress entries by topic for a given student.
 * Returns sorted array: weakest topics first.
 *
 * @param {Array} entries - progress_entries rows for this student
 * @returns {Array<{topic, problems_solved, status}>}
 */
function analyzeProgress(entries) {
  // Aggregate problems_solved per topic (sum across platforms)
  const topicMap = {};

  for (const entry of entries) {
    const topic = entry.topic.trim();
    if (!topicMap[topic]) {
      topicMap[topic] = 0;
    }
    topicMap[topic] += entry.problems_solved;
  }

  // Build result array with status classification
  const result = Object.entries(topicMap).map(([topic, problems_solved]) => ({
    topic,
    problems_solved,
    status: classifyStatus(problems_solved),
  }));

  // Sort: weak first, then moderate, then strong; within same status sort by count asc
  const statusOrder = { weak: 0, moderate: 1, strong: 2 };
  result.sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.problems_solved - b.problems_solved;
  });

  return result;
}

/**
 * Get the weakest topic for a student (first in sorted list).
 */
function getWeakestTopic(entries) {
  const analyzed = analyzeProgress(entries);
  return analyzed.length > 0 ? analyzed[0] : null;
}

/**
 * Get only weak + moderate topics (for planner input).
 */
function getWeakAndModerateTopics(entries) {
  return analyzeProgress(entries).filter(
    (t) => t.status === 'weak' || t.status === 'moderate'
  );
}

module.exports = { analyzeProgress, getWeakestTopic, getWeakAndModerateTopics };
