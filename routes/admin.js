const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken, requireAdmin);

// GET /admin — dashboard: list all cards
router.get('/', async (req, res) => {
  const result = await db.query(`
    SELECT c.*, u.email, u.role
    FROM cards c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
  `);
  res.render('admin/dashboard', { cards: result.rows, user: req.user });
});

// GET /admin/cards/new — create new card form
router.get('/cards/new', (req, res) => {
  res.render('admin/edit-card', { card: null, clientEmail: '', error: null, success: null });
});

// POST /admin/cards/new — create user + card
router.post('/cards/new', async (req, res) => {
  const {
    client_email, client_password, slug,
    name, title, company, company_highlight,
    email, phone_us, phone_intl, website, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, is_published
  } = req.body;

  try {
    // Check slug uniqueness
    const slugCheck = await db.query('SELECT id FROM cards WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return res.render('admin/edit-card', {
        card: req.body, clientEmail: client_email,
        error: 'That URL slug is already taken.', success: null
      });
    }

    // Create user
    const hash = await bcrypt.hash(client_password, 10);
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [client_email.toLowerCase().trim(), hash, 'client']
    );
    const userId = userResult.rows[0].id;

    // Create card
    await db.query(`
      INSERT INTO cards (
        user_id, slug, name, title, company, company_highlight,
        email, phone_us, phone_intl, website, location,
        linkedin, instagram, twitter, facebook, github, youtube, tiktok,
        brand_name, brand_tagline, is_published
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    `, [
      userId, slug, name, title, company, company_highlight,
      email, phone_us, phone_intl, website, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, is_published === 'on'
    ]);

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    const msg = err.code === '23505' ? 'Email already exists.' : 'Error creating card.';
    res.render('admin/edit-card', { card: req.body, clientEmail: client_email, error: msg, success: null });
  }
});

// GET /admin/cards/:id/edit
router.get('/cards/:id/edit', async (req, res) => {
  const result = await db.query(`
    SELECT c.*, u.email as client_email
    FROM cards c JOIN users u ON c.user_id = u.id
    WHERE c.id = $1
  `, [req.params.id]);

  if (!result.rows[0]) return res.redirect('/admin');
  res.render('admin/edit-card', { card: result.rows[0], clientEmail: result.rows[0].client_email, error: null, success: null });
});

// POST /admin/cards/:id/edit
router.post('/cards/:id/edit', async (req, res) => {
  const {
    slug, name, title, company, company_highlight,
    email, phone_us, phone_intl, website, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, is_published, new_password
  } = req.body;

  try {
    await db.query(`
      UPDATE cards SET
        slug=$1, name=$2, title=$3, company=$4, company_highlight=$5,
        email=$6, phone_us=$7, phone_intl=$8, website=$9, location=$10,
        linkedin=$11, instagram=$12, twitter=$13, facebook=$14, github=$15,
        youtube=$16, tiktok=$17, brand_name=$18, brand_tagline=$19, is_published=$20
      WHERE id=$21
    `, [
      slug, name, title, company, company_highlight,
      email, phone_us, phone_intl, website, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, is_published === 'on',
      req.params.id
    ]);

    // Optionally update client password
    if (new_password && new_password.trim()) {
      const hash = await bcrypt.hash(new_password, 10);
      const cardRow = await db.query('SELECT user_id FROM cards WHERE id=$1', [req.params.id]);
      await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, cardRow.rows[0].user_id]);
    }

    const result = await db.query(`
      SELECT c.*, u.email as client_email
      FROM cards c JOIN users u ON c.user_id = u.id WHERE c.id = $1
    `, [req.params.id]);
    res.render('admin/edit-card', { card: result.rows[0], clientEmail: result.rows[0].client_email, error: null, success: 'Card updated successfully.' });
  } catch (err) {
    console.error(err);
    res.render('admin/edit-card', { card: req.body, clientEmail: '', error: 'Error updating card.', success: null });
  }
});

// POST /admin/cards/:id/delete
router.post('/cards/:id/delete', async (req, res) => {
  const card = await db.query('SELECT user_id FROM cards WHERE id=$1', [req.params.id]);
  if (card.rows[0]) {
    await db.query('DELETE FROM users WHERE id=$1', [card.rows[0].user_id]);
  }
  res.redirect('/admin');
});

module.exports = router;
