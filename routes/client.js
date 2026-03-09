const express = require('express');
const multer = require('multer');
const db = require('../db');
const { uploadImage } = require('../lib/cloudinary');
const { verifyToken } = require('../middleware/auth');
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

router.use(verifyToken);

// GET /dashboard
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM cards WHERE user_id = $1', [req.user.id]);
  const card = result.rows[0];
  if (!card) return res.render('client/no-card', { user: req.user });
  res.render('client/dashboard', { card, user: req.user, error: null, success: null });
});

// POST /dashboard/edit
router.post('/edit', async (req, res) => {
  const {
    name, title, company, company_highlight,
    email, phone_us, phone_intl, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, logo_invert, logo_size
  } = req.body;

  const emails = parseEmails(req.body);
  const phones = parsePhones(req.body);
  const websites = parseWebsites(req.body);

  try {
    await db.query(`
      UPDATE cards SET
        name=$1, title=$2, company=$3, company_highlight=$4,
        email=$5, phone_us=$6, phone_intl=$7, location=$8,
        linkedin=$9, instagram=$10, twitter=$11, facebook=$12, github=$13,
        youtube=$14, tiktok=$15, brand_name=$16, brand_tagline=$17, logo_invert=$18,
        logo_size=$19, emails=$20, phones=$21, websites=$22
      WHERE user_id=$23
    `, [
      name, title, company, company_highlight,
      email, phone_us, phone_intl, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, logo_invert || '', parseInt(logo_size) || 60,
      JSON.stringify(emails), JSON.stringify(phones), JSON.stringify(websites),
      req.user.id
    ]);

    const result = await db.query('SELECT * FROM cards WHERE user_id=$1', [req.user.id]);
    res.render('client/dashboard', { card: result.rows[0], user: req.user, error: null, success: 'Your card has been updated!' });
  } catch (err) {
    console.error(err);
    const result = await db.query('SELECT * FROM cards WHERE user_id=$1', [req.user.id]);
    res.render('client/dashboard', { card: result.rows[0], user: req.user, error: 'Error saving changes.', success: null });
  }
});

// POST /dashboard/upload-headshot
router.post('/upload-headshot', upload.single('headshot'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const card = await db.query('SELECT id FROM cards WHERE user_id=$1', [req.user.id]);
    if (!card.rows[0]) return res.status(404).json({ error: 'Card not found' });
    const url = await uploadImage(req.file.buffer, 'business-cards/headshots', `headshot-${card.rows[0].id}`);
    await db.query('UPDATE cards SET headshot_url=$1 WHERE user_id=$2', [url, req.user.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /dashboard/upload-logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const card = await db.query('SELECT id FROM cards WHERE user_id=$1', [req.user.id]);
    if (!card.rows[0]) return res.status(404).json({ error: 'Card not found' });
    const url = await uploadImage(req.file.buffer, 'business-cards/logos', `logo-${card.rows[0].id}`);
    await db.query('UPDATE cards SET logo_url=$1 WHERE user_id=$2', [url, req.user.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /dashboard/upload-logo-inverted
router.post('/upload-logo-inverted', upload.single('logo_inverted'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const card = await db.query('SELECT id FROM cards WHERE user_id=$1', [req.user.id]);
    if (!card.rows[0]) return res.status(404).json({ error: 'Card not found' });
    const url = await uploadImage(req.file.buffer, 'business-cards/logos', `logo-inverted-${card.rows[0].id}`);
    await db.query('UPDATE cards SET logo_inverted_url=$1 WHERE user_id=$2', [url, req.user.id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
