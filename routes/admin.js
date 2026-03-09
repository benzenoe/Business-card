const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('../db');
const { uploadImage } = require('../lib/cloudinary');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parseEmails(body) {
  const labels = [].concat(body.email_label || []);
  const values = [].concat(body.email_value || []);
  return labels.map((l, i) => ({ label: l, value: values[i] })).filter(e => e.value);
}

function parsePhones(body) {
  const labels = [].concat(body.phone_label || []);
  const values = [].concat(body.phone_value || []);
  const whatsapps = [].concat(body.phone_whatsapp || []);
  return labels.map((l, i) => ({ label: l, value: values[i], whatsapp: whatsapps[i] === 'on' })).filter(p => p.value);
}

function parseWebsites(body) {
  const labels = [].concat(body.website_label || []);
  const values = [].concat(body.website_value || []);
  return labels.map((l, i) => ({ label: l, value: values[i] })).filter(w => w.value);
}

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
    email, phone_us, phone_intl, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, is_published
  } = req.body;

  const emails = parseEmails(req.body);
  const phones = parsePhones(req.body);
  const websites = parseWebsites(req.body);

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
        email, phone_us, phone_intl, location,
        linkedin, instagram, twitter, facebook, github, youtube, tiktok,
        brand_name, brand_tagline, is_published, emails, phones, websites,
        primary_color, secondary_color, bg_color_start, bg_color_end, accent_bar_color
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
    `, [
      userId, slug, name, title, company, company_highlight,
      email, phone_us, phone_intl, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, is_published === 'on',
      JSON.stringify(emails), JSON.stringify(phones), JSON.stringify(websites),
      null, null, null, null, null
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
    email, phone_us, phone_intl, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, is_published, logo_invert, logo_size, new_password,
    primary_color, secondary_color, bg_color_start, bg_color_end, accent_bar_color
  } = req.body;

  const emails = parseEmails(req.body);
  const phones = parsePhones(req.body);
  const websites = parseWebsites(req.body);

  try {
    await db.query(`
      UPDATE cards SET
        slug=$1, name=$2, title=$3, company=$4, company_highlight=$5,
        email=$6, phone_us=$7, phone_intl=$8, location=$9,
        linkedin=$10, instagram=$11, twitter=$12, facebook=$13, github=$14,
        youtube=$15, tiktok=$16, brand_name=$17, brand_tagline=$18, is_published=$19,
        logo_invert=$20, logo_size=$21, emails=$22, phones=$23,
        websites=$24, primary_color=$25, secondary_color=$26, bg_color_start=$27, bg_color_end=$28, accent_bar_color=$29
      WHERE id=$30
    `, [
      slug, name, title, company, company_highlight,
      email, phone_us, phone_intl, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, is_published === 'on', logo_invert || '',
      parseInt(logo_size) || 60, JSON.stringify(emails), JSON.stringify(phones),
      JSON.stringify(websites), primary_color, secondary_color, bg_color_start, bg_color_end,
      accent_bar_color, req.params.id
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
    const cardData = { ...req.body, id: req.params.id };
    const clientRow = await db.query('SELECT u.email as client_email FROM cards c JOIN users u ON c.user_id = u.id WHERE c.id = $1', [req.params.id]).catch(() => ({ rows: [] }));
    res.render('admin/edit-card', { card: cardData, clientEmail: clientRow.rows[0]?.client_email || '', error: 'Error updating card.', success: null });
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

// POST /admin/cards/:id/upload-headshot
router.post('/cards/:id/upload-headshot', upload.single('headshot'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = await uploadImage(req.file.buffer, 'business-cards/headshots', `headshot-${req.params.id}`);
    await db.query('UPDATE cards SET headshot_url=$1 WHERE id=$2', [url, req.params.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /admin/cards/:id/upload-logo
router.post('/cards/:id/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = await uploadImage(req.file.buffer, 'business-cards/logos', `logo-${req.params.id}`);
    await db.query('UPDATE cards SET logo_url=$1 WHERE id=$2', [url, req.params.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /admin/cards/:id/upload-logo-inverted
router.post('/cards/:id/upload-logo-inverted', upload.single('logo_inverted'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const url = await uploadImage(req.file.buffer, 'business-cards/logos', `logo-inverted-${req.params.id}`);
    await db.query('UPDATE cards SET logo_inverted_url=$1 WHERE id=$2', [url, req.params.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
