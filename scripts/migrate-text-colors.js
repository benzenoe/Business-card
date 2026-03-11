require('dotenv').config();
const db = require('../db');

async function migrate() {
  await db.query(`
    ALTER TABLE cards
      ADD COLUMN IF NOT EXISTS label_color VARCHAR(20),
      ADD COLUMN IF NOT EXISTS info_color VARCHAR(20);
  `);
  console.log('✓ Added label_color and info_color columns');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
