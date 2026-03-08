/**
 * Run once to:
 * 1. Create all DB tables
 * 2. Create the admin user
 *
 * Usage: node scripts/setup.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');

async function setup() {
  console.log('Running database setup...');

  // Create tables
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  await db.query(schema);
  console.log('✓ Tables created');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'eytan@benzeno.com';
  const adminPassword = process.argv[2];

  if (!adminPassword) {
    console.error('Usage: node scripts/setup.js <admin-password>');
    process.exit(1);
  }

  const existing = await db.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (existing.rows.length > 0) {
    console.log(`✓ Admin user already exists (${adminEmail})`);
  } else {
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [adminEmail, hash, 'admin']
    );
    console.log(`✓ Admin user created: ${adminEmail}`);
  }

  console.log('\nSetup complete! Run: npm start');
  process.exit(0);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
