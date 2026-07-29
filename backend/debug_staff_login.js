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

async function debugStaffLogin() {
  console.log('Checking auth/debug-staff:');
  const debug = await makeRequest('GET', '/auth/debug-staff');
  console.log('Status:', debug.status);
  console.log('Body:', JSON.stringify(debug.body, null, 2));

  console.log('\nTrying staff login:');
  const login = await makeRequest('POST', '/auth/login', { email: 'admin@careerforge.ai', password: 'Admin@123' });
  console.log('Status:', login.status);
  console.log('Body:', JSON.stringify(login.body, null, 2));
}

debugStaffLogin().catch(console.error);
