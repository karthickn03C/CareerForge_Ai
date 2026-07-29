require('dotenv').config();
const { initDb, queryAll, execute } = require('./db/database');

async function checkSchema() {
  await initDb();
  
  // Check students table schema
  const cols = queryAll("PRAGMA table_info(students)");
  console.log('Students table columns:');
  cols.forEach(c => console.log(`  ${c.cid}: ${c.name} (${c.type})`));
  
  // Check if last_login exists
  const hasLastLogin = cols.some(c => c.name === 'last_login');
  console.log('\nlast_login column exists:', hasLastLogin);
  
  // Try the exact UPDATE that's failing
  try {
    execute("UPDATE students SET last_login = datetime('now'), status = 'Active Now' WHERE email = 'admin@careerforge.ai'");
    console.log('UPDATE last_login: SUCCESS');
  } catch(err) {
    console.log('UPDATE last_login ERROR:', err.message);
  }
}

checkSchema().catch(console.error);
