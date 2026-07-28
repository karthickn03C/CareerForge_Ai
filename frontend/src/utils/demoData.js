/**
 * Demo Data Provider for CareerForge AI
 * Supplies rich fallback data for Progress, Submissions, and Analysis when database is empty.
 */

export const DEMO_PROGRESS_ANALYSIS = [
  { topic: 'Array', problems_solved: 15, status: 'strong' },
  { topic: 'String', problems_solved: 12, status: 'strong' },
  { topic: 'Binary Search', problems_solved: 10, status: 'moderate' },
  { topic: 'Sliding Window', problems_solved: 8, status: 'moderate' },
  { topic: 'Graph', problems_solved: 5, status: 'weak' },
  { topic: 'Dynamic Programming', problems_solved: 3, status: 'weak' }
];

export const DEMO_SUBMISSIONS_HISTORY = [
  { id: 'sub_1', question_title: 'Two Sum', topic: 'Arrays', difficulty: 'Easy', status: 'Accepted', language: 'Python', date: 'Today' },
  { id: 'sub_2', question_title: 'Binary Search', topic: 'Binary Search', difficulty: 'Easy', status: 'Accepted', language: 'Java', date: 'Yesterday' },
  { id: 'sub_3', question_title: 'Longest Substring Without Repeating Characters', topic: 'Sliding Window', difficulty: 'Medium', status: 'Accepted', language: 'Python', date: '2 days ago' },
  { id: 'sub_4', question_title: 'Merge Intervals', topic: 'Arrays', difficulty: 'Medium', status: 'Accepted', language: 'Java', date: '3 days ago' },
  { id: 'sub_5', question_title: 'Reverse Linked List', topic: 'Linked List', difficulty: 'Easy', status: 'Accepted', language: 'C++', date: '4 days ago' },
  { id: 'sub_6', question_title: 'Number of Islands', topic: 'Graph', difficulty: 'Medium', status: 'Accepted', language: 'Python', date: '5 days ago' },
  { id: 'sub_7', question_title: 'LRU Cache', topic: 'System Design', difficulty: 'Hard', status: 'Accepted', language: 'Java', date: '6 days ago' },
  { id: 'sub_8', question_title: 'Word Ladder', topic: 'Graph', difficulty: 'Hard', status: 'Accepted', language: 'C++', date: '1 week ago' }
];
