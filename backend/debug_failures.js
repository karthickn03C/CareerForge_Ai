require('dotenv').config();
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const parsed = new URL(url);
    const reqHeaders = { 'Content-Type': 'application/json' };
    let reqBody = null;
    if (body) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }
    const req = http.request(parsed, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } 
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function debugFailures() {
  console.log('\n=== DEBUG FAILING TESTS ===\n');

  // Test 1: Staff login
  console.log('1. Staff Login:');
  const staffLogin = await makeRequest('POST', '/auth/login', {
    email: 'admin@careerforge.ai',
    password: 'Admin@123'
  });
  console.log('   Status:', staffLogin.status);
  console.log('   Body:', JSON.stringify(staffLogin.body, null, 2));
  
  // Test 2: Staff analytics
  console.log('\n2. Staff Analytics:');
  const analytics = await makeRequest('GET', '/students/staff/analytics');
  console.log('   Status:', analytics.status);
  console.log('   Body keys:', Object.keys(analytics.body || {}));
  console.log('   success:', analytics.body?.success);
  console.log('   stats:', analytics.body?.stats);

  // Test 3: Staff activity-feed  
  console.log('\n3. Staff Activity Feed:');
  const feed = await makeRequest('GET', '/students/staff/activity-feed');
  console.log('   Status:', feed.status);
  console.log('   Body:', JSON.stringify(feed.body, null, 2).substring(0, 300));

  // Test 4: Resume upload
  console.log('\n4. Resume Upload (text):');
  const resumeRes = await makeRequest('POST', '/resume/10/upload', {
    rawText: 'Software engineer skilled in React, Node.js, Python, PostgreSQL, AWS, Docker. Built SaaS products with real-time features. Led a team of 5.'
  });
  console.log('   Status:', resumeRes.status);
  console.log('   Body keys:', Object.keys(resumeRes.body || {}));
  console.log('   atsScores:', resumeRes.body?.atsScores);

  // Test 5: Interview start
  console.log('\n5. Interview Start:');
  const interviewStart = await makeRequest('POST', '/interview/10/start', { topic: 'React', mode: 'technical' });
  console.log('   Status:', interviewStart.status);
  console.log('   Body:', JSON.stringify(interviewStart.body, null, 2).substring(0, 300));

  // Test 6: Reports CSV
  console.log('\n6. Reports CSV:');
  const csvReq = await makeRequest('GET', '/reports/download/csv');
  console.log('   Status:', csvReq.status);
  console.log('   Body type:', typeof csvReq.body);
  if (typeof csvReq.body === 'string') console.log('   First 200 chars:', csvReq.body.substring(0, 200));

  // Test 7: Planner
  console.log('\n7. Study Planner Generate:');
  const planRes = await makeRequest('POST', '/planner/10/generate', { targetCompany: 'Google', target_date: '2026-09-01' });
  console.log('   Status:', planRes.status);
  console.log('   Body keys:', Object.keys(planRes.body || {}));
  console.log('   plan exists:', !!planRes.body?.plan);

  console.log('\n=== DEBUG COMPLETE ===');
}

debugFailures().catch(console.error);
