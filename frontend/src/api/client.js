import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Students ──────────────────────────────────────────────────────────────
export const getStudents = () => api.get('/students').then(r => r.data);
export const getStudent = (id) => api.get(`/students/${id}`).then(r => r.data);
export const createStudent = (data) => api.post('/students', data).then(r => r.data);
export const syncStudent = (data) => api.post('/students/sync', data).then(r => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then(r => r.data);
export const deleteStudent = (id) => api.delete(`/students/${id}`).then(r => r.data);

// ── Progress ──────────────────────────────────────────────────────────────
export const getProgress = (studentId) =>
  api.get(`/progress/${studentId}`).then(r => r.data);

export const addProgressEntry = (studentId, data) =>
  api.post(`/progress/${studentId}`, data).then(r => r.data);

export const importFromLeetCode = (studentId, username) =>
  api.post(`/progress/${studentId}/import-leetcode`, { username }).then(r => r.data);

export const refreshLeetCodeStats = (studentId) =>
  api.post(`/progress/${studentId}/refresh-leetcode`).then(r => r.data);

export const unlinkLeetCodeAccount = (studentId) =>
  api.post(`/progress/${studentId}/unlink-leetcode`).then(r => r.data);

export const deleteProgressEntry = (entryId) =>
  api.delete(`/progress/entry/${entryId}`).then(r => r.data);

// ── PrepPilot Progress ───────────────────────────────────────────────────
export const getStudentExternalProgress = (studentId) =>
  api.get(`/students/${studentId}/progress`).then(r => r.data);

export const getPrepPilotProgress = (studentId) =>
  api.get(`/students/${studentId}/preppilot-progress`).then(r => r.data);

export const getPrepPilotHistory = (studentId) =>
  api.get(`/students/${studentId}/preppilot-history`).then(r => r.data);

export const logPrepPilotSolved = (studentId, { title, topic, difficulty, language }) =>
  api.post(`/students/${studentId}/preppilot-history`, { title, topic, difficulty, language }).then(r => r.data);

// ── Questions ─────────────────────────────────────────────────────────────
export const getQuestions = (studentId) =>
  api.get(`/questions/${studentId}`).then(r => r.data);

export const generateQuestion = (studentId, { topic, difficulty } = {}) =>
  api.post(`/questions/${studentId}/generate`, { topic, difficulty }).then(r => r.data);

export const generateCodingProblem = (studentId, { topic, difficulty, language } = {}) =>
  api.post(`/questions/${studentId}/generate-coding`, { topic, difficulty, language }).then(r => r.data);

export const getCodingHint = ({ title, description, code, language }) =>
  api.post('/questions/hint', { title, description, code, language }).then(r => r.data);

export const executeCode = ({ code, language, testCases }) =>
  api.post('/questions/execute', { code, language, testCases }).then(r => r.data);

// ── Interview ─────────────────────────────────────────────────────────────
export const getInterviewSessions = (studentId) =>
  api.get(`/interview/${studentId}`).then(r => r.data);

export const startInterviewSession = (studentId, { topic, mode } = {}) =>
  api.post(`/interview/${studentId}/start`, { topic, mode }).then(r => r.data);

export const submitInterviewAnswer = (sessionId, { student_answer, topic } = {}) =>
  api.post(`/interview/session/${sessionId}/answer`, { student_answer, topic }).then(r => r.data);

// ── Planner ───────────────────────────────────────────────────────────────
export const getLatestPlan = (studentId) =>
  api.get(`/planner/${studentId}`).then(r => r.data);

export const generatePlan = (studentId, { target_date, targetCompany } = {}) =>
  api.post(`/planner/${studentId}/generate`, { target_date, targetCompany }).then(r => r.data);

// ── Resume Analyzer ───────────────────────────────────────────────────────
export const getLatestResumeAnalysis = (studentId) =>
  api.get(`/resume/${studentId}`).then(r => r.data);

export const uploadResumeFile = (studentId, formData) =>
  api.post(`/resume/${studentId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const uploadResumeText = (studentId, rawText) =>
  api.post(`/resume/${studentId}/upload`, { rawText }).then(r => r.data);

export const matchJobDescription = (studentId, jobDescription) =>
  api.post(`/resume/${studentId}/job-match`, { jobDescription }).then(r => r.data);

export const chatResume = (studentId, prompt, history) =>
  api.post(`/resume/${studentId}/chat`, { prompt, history }).then(r => r.data);

// ── Opportunity Discovery ─────────────────────────────────────────────────
export const getSavedOpportunities = (studentId) =>
  api.get(`/opportunities/${studentId}/saved`).then(r => r.data);

export const saveOpportunity = (studentId, opp) =>
  api.post(`/opportunities/${studentId}/save`, opp).then(r => r.data);

export const discoverOpportunities = (studentId, profile) =>
  api.post(`/opportunities/${studentId}/discover`, profile).then(r => r.data);

// ── ForgeMind AI Multi-Agent Orchestrator ─────────────────────────
export const sendForgemindChat = (studentId, formData) =>
  api.post(`/forgemind/${studentId}/chat`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);

export const getForgemindConversations = (studentId) =>
  api.get(`/forgemind/${studentId}/conversations`).then(r => r.data);

export const getForgemindMessages = (conversationId) =>
  api.get(`/forgemind/messages/${conversationId}`).then(r => r.data);

export const deleteForgemindConversation = (conversationId) =>
  api.delete(`/forgemind/conversations/${conversationId}`).then(r => r.data);

export const togglePinForgemindConversation = (conversationId) =>
  api.post(`/forgemind/conversations/${conversationId}/pin`).then(r => r.data);

export default api;
