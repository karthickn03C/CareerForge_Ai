const { initDb, queryOne, queryAll } = require('./db/database');

async function testDatabase() {
  await initDb();
  console.log('=== DATABASE INTEGRITY QA TEST ===');
  
  const students = queryAll('SELECT id, name, email, role, placement_readiness, resume_score, coding_score, interview_score FROM students');
  console.log('1. Total Students in DB:', students.length);
  console.log('   Students List:', students.map(s => `${s.name} (${s.email}) - Role: ${s.role} - Readiness: ${s.placement_readiness}%`));

  const staff = queryAll("SELECT id, name, email, role FROM students WHERE role = 'staff'");
  console.log('2. Staff Seed Accounts in DB:', staff.length);
  console.log('   Staff List:', staff.map(s => `${s.name} (${s.email})`));

  const activities = queryAll('SELECT id, student_id, event_type, description, created_at FROM student_activity ORDER BY created_at DESC LIMIT 10');
  console.log('3. Recent Activity Log Entries:', activities.length);
  console.log('   Activities Sample:', activities);

  const analyses = queryAll('SELECT id, student_id, file_name, uploaded_at FROM resume_analyses');
  console.log('4. Resume Analyses Count:', analyses.length);

  const interviews = queryAll('SELECT id, student_id, mode, score FROM interview_sessions');
  console.log('5. Interview Sessions Count:', interviews.length);

  const coding = queryAll('SELECT id, student_id, title, difficulty, date_solved FROM preppilot_coding_history');
  console.log('6. Coding Solved History Count:', coding.length);

  const plans = queryAll('SELECT id, student_id, target_company, generated_at FROM plans');
  console.log('7. Study Plans Count:', plans.length);

  console.log('=== QA DATABASE INTEGRITY VERIFICATION COMPLETE ===');
}

testDatabase().catch(console.error);
