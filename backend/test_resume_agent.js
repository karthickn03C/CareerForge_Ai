require('dotenv').config();
const { parseResumeWithAI } = require('./agents/resumeAgent');

async function testResume() {
  try {
    const res = await parseResumeWithAI('Software developer skilled in React, Node, Python, SQL.');
    console.log('Resume Parse Output:', res);
  } catch (err) {
    console.error('Resume Parse Error:', err);
  }
}

testResume();
