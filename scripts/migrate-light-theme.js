require('dotenv').config();
const db = require('../db');

async function migrate() {
  await db.query(`
    ALTER TABLE cards ADD COLUMN IF NOT EXISTS light_theme BOOLEAN DEFAULT FALSE;
  `);
  console.log('✓ Added light_theme column');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
