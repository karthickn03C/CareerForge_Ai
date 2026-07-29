const http = require('http');
const https = require('https');
const { initDb, queryOne, queryAll, logActivity, recalculateStudentScores } = require('./db/database');

const API_BASE = 'http://localhost:5000/api';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const parsed = new URL(url);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    let reqBody = null;
    if (body) {
      reqBody = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const req = http.request(parsed, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function runE2EQASuite() {
  console.log('====================================================');
  console.log('      CAREERFORGE AI COMPLETE QA AUTOMATION SUITE   ');
  console.log('====================================================\n');

  const report = [];
  function logResult(part, testName, passed, details = '') {
    const icon = passed ? '✔ PASS' : '❌ FAIL';
    console.log(`[${icon}] ${part} - ${testName} ${details ? `(${details})` : ''}`);
    report.push({ part, testName, passed, details });
  }

  // 1. Health & Server Check
  try {
    const health = await makeRequest('GET', '/health');
    logResult('PART 1: SERVER & API', 'Backend Health Endpoint', health.status === 200 && health.body.status === 'ok');
  } catch (e) {
    logResult('PART 1: SERVER & API', 'Backend Health Endpoint', false, e.message);
  }

  // 2. Part 2: Register New Student
  const testEmail = `qa.student.${Date.now()}@careerforge.ai`;
  const testPass = 'Career@123';
  let studentToken = null;
  let studentId = null;

  try {
    const regRes = await makeRequest('POST', '/auth/register', {
      name: 'QA Test Candidate',
      email: testEmail,
      password: testPass,
      confirmPassword: testPass
    });

    const isRegOk = regRes.status === 201 && regRes.body.success && regRes.body.token;
    logResult('PART 2: REGISTER', 'Student Account Registration', isRegOk, `Email: ${testEmail}`);
    if (isRegOk) {
      studentToken = regRes.body.token;
      studentId = regRes.body.user.studentId;
    }
  } catch (e) {
    logResult('PART 2: REGISTER', 'Student Account Registration', false, e.message);
  }

  // Verify DB for registered student
  if (studentId) {
    await initDb();
    const dbStudent = queryOne('SELECT * FROM students WHERE email = ?', [testEmail]);
    logResult('PART 2: REGISTER DB', 'Student Saved in PostgreSQL', Boolean(dbStudent && dbStudent.role === 'student'), `Role: ${dbStudent?.role}`);
  }

  // 3. Part 3: Login
  try {
    const loginRes = await makeRequest('POST', '/auth/login', {
      email: testEmail,
      password: testPass
    });

    const isLoginOk = loginRes.status === 200 && loginRes.body.success && loginRes.body.token;
    logResult('PART 3: LOGIN', 'Student Authentication & JWT Generation', isLoginOk);
  } catch (e) {
    logResult('PART 3: LOGIN', 'Student Authentication & JWT Generation', false, e.message);
  }

  // 4. Part 4: Student Dashboard Data Fetch
  if (studentId) {
    try {
      const studentData = await makeRequest('GET', `/students/${studentId}`);
      logResult('PART 4: DASHBOARD', 'Student Profile Data Fetch', studentData.status === 200 && Boolean(studentData.body.id));
    } catch (e) {
      logResult('PART 4: DASHBOARD', 'Student Profile Data Fetch', false, e.message);
    }
  }

  // 5. Part 5: ForgeMind AI Chat & Memory
  if (studentId) {
    try {
      const chatRes = await makeRequest('POST', `/forgemind/${studentId}/chat`, {
        prompt: 'Create a learning roadmap for Full Stack Development.'
      });
      const isChatOk = chatRes.status === 200 && chatRes.body.markdownResponse;
      logResult('PART 5: FORGEMIND AI', 'Roadmap Generation Chat', isChatOk);

      // Verify conversation saved
      const convs = await makeRequest('GET', `/forgemind/${studentId}/conversations`);
      logResult('PART 5: FORGEMIND AI', 'Conversation Memory & Storage', convs.status === 200 && Array.isArray(convs.body));
    } catch (e) {
      logResult('PART 5: FORGEMIND AI', 'ForgeMind AI Suite', false, e.message);
    }
  }

  // 6. Part 6: Resume Analyzer
  if (studentId) {
    try {
      const resumeRes = await makeRequest('POST', `/resume/${studentId}/upload`, {
        rawText: 'Experienced Full Stack Engineer with expertise in Node.js, React, PostgreSQL, Docker, AWS, and REST APIs. Built scalable SaaS products.'
      });
      const isResumeOk = resumeRes.status === 201 && resumeRes.body.atsScores;
      logResult('PART 6: RESUME ANALYZER', 'Resume Upload & ATS Analysis', isResumeOk, `ATS Score: ${resumeRes.body?.atsScores?.overallScore || 'N/A'}`);
    } catch (e) {
      logResult('PART 6: RESUME ANALYZER', 'Resume Analyzer Suite', false, e.message);
    }
  }

  // 7. Part 7: Coding Practice
  if (studentId) {
    try {
      const codeRes = await makeRequest('POST', `/students/${studentId}/preppilot-history`, {
        title: 'Two Sum',
        topic: 'Arrays',
        difficulty: 'easy',
        language: 'python'
      });
      logResult('PART 7: CODING PRACTICE', 'Code Problem Submission & Scoring', codeRes.status === 201 && Boolean(codeRes.body.id));
    } catch (e) {
      logResult('PART 7: CODING PRACTICE', 'Coding Practice Suite', false, e.message);
    }
  }

  // 8. Part 8: Mock Interview
  if (studentId) {
    try {
      const startInt = await makeRequest('POST', `/interview/${studentId}/start`, {
        topic: 'React & System Design',
        mode: 'technical'
      });
      if (startInt.status === 200 && startInt.body.sessionId) {
        const ansRes = await makeRequest('POST', `/interview/session/${startInt.body.sessionId}/answer`, {
          student_answer: 'React uses a Virtual DOM to minimize actual DOM updates through diffing and reconciliation algorithm.'
        });
        logResult('PART 8: MOCK INTERVIEW', 'Interview Answer Evaluation & Scoring', ansRes.status === 200 && Boolean(ansRes.body.evaluation));
      } else {
        logResult('PART 8: MOCK INTERVIEW', 'Interview Session Start', false);
      }
    } catch (e) {
      logResult('PART 8: MOCK INTERVIEW', 'Mock Interview Suite', false, e.message);
    }
  }

  // 9. Part 9: Study Planner
  if (studentId) {
    try {
      const planRes = await makeRequest('POST', `/planner/${studentId}/generate`, {
        targetCompany: 'Google',
        target_date: '2026-09-01'
      });
      logResult('PART 9: STUDY PLANNER', 'AI Roadmap Generation & Storage', planRes.status === 200 && Boolean(planRes.body.plan));
    } catch (e) {
      logResult('PART 9: STUDY PLANNER', 'Study Planner Suite', false, e.message);
    }
  }

  // 10. Part 11: Opportunities Discovery
  if (studentId) {
    try {
      const opps = await makeRequest('GET', `/opportunities/${studentId}/saved`);
      logResult('PART 11: OPPORTUNITIES', 'Opportunity Discovery Endpoint', opps.status === 200 && Array.isArray(opps.body));
    } catch (e) {
      logResult('PART 11: OPPORTUNITIES', 'Opportunities Suite', false, e.message);
    }
  }

  // 11. Part 13: Staff Login
  let staffToken = null;
  try {
    const staffLogin = await makeRequest('POST', '/auth/login', {
      email: 'admin@careerforge.ai',
      password: 'Admin@123'
    });
    const isStaffOk = staffLogin.status === 200 && staffLogin.body.user?.role === 'staff';
    logResult('PART 13: STAFF LOGIN', 'Staff Authentication', isStaffOk, `Role: ${staffLogin.body?.user?.role}`);
    if (isStaffOk) staffToken = staffLogin.body.token;
  } catch (e) {
    logResult('PART 13: STAFF LOGIN', 'Staff Authentication', false, e.message);
  }

  // 12. Part 14: Staff Dashboard Analytics & Live Feed
  try {
    const analytics = await makeRequest('GET', '/students/staff/analytics');
    const isAnalyticsOk = analytics.status === 200 && analytics.body.success && analytics.body.stats;
    logResult('PART 14: STAFF DASHBOARD', 'Staff Analytics & Roster Fetch', isAnalyticsOk, `Total Monitored: ${analytics.body?.stats?.totalStudents}`);

    const feed = await makeRequest('GET', '/students/staff/activity-feed');
    logResult('PART 14: STAFF DASHBOARD', 'Real-Time Activity Feed Endpoint', feed.status === 200 && feed.body.success);
  } catch (e) {
    logResult('PART 14: STAFF DASHBOARD', 'Staff Dashboard Analytics Suite', false, e.message);
  }

  // 13. Part 15: Staff ForgeMind AI Queries
  if (studentId) {
    try {
      const fullProfile = await makeRequest('GET', `/students/${studentId}/full-profile`);
      logResult('PART 15: FORGEMIND STAFF AI', 'Dynamic Student Full Profile Lookup', fullProfile.status === 200 && Boolean(fullProfile.body.student));
    } catch (e) {
      logResult('PART 15: FORGEMIND STAFF AI', 'Staff AI Suite', false, e.message);
    }
  }

  // 14. Part 16 & Reports: CSV Export
  try {
    const csvRes = await makeRequest('GET', '/reports/download/csv');
    logResult('PART 16: REPORTS', 'CSV Excel Report Generation & Download', csvRes.status === 200 && typeof csvRes.body === 'string' && csvRes.body.includes('Placement Readiness'));
  } catch (e) {
    logResult('PART 16: REPORTS', 'CSV Export Suite', false, e.message);
  }

  console.log('\n====================================================');
  console.log('               TESTING SUMMARY REPORT               ');
  console.log('====================================================');
  const total = report.length;
  const passedCount = report.filter(r => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Automated Tests Executed: ${total}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Pass Rate: ${((passedCount / total) * 100).toFixed(1)}%`);
  console.log('====================================================\n');
}

runE2EQASuite().catch(console.error);
