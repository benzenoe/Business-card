const express = require('express');
const multer = require('multer');
const db = require('../db');
const { uploadImage } = require('../lib/cloudinary');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
    email, phone_us, phone_intl, website, location,
    linkedin, instagram, twitter, facebook, github, youtube, tiktok,
    brand_name, brand_tagline, logo_invert
  } = req.body;

  try {
    await db.query(`
      UPDATE cards SET
        name=$1, title=$2, company=$3, company_highlight=$4,
        email=$5, phone_us=$6, phone_intl=$7, website=$8, location=$9,
        linkedin=$10, instagram=$11, twitter=$12, facebook=$13, github=$14,
        youtube=$15, tiktok=$16, brand_name=$17, brand_tagline=$18, logo_invert=$19
      WHERE user_id=$20
    `, [
      name, title, company, company_highlight,
      email, phone_us, phone_intl, website, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, logo_invert === 'on', req.user.id
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

module.exports = router;
