const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

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
    brand_name, brand_tagline
  } = req.body;

  try {
    await db.query(`
      UPDATE cards SET
        name=$1, title=$2, company=$3, company_highlight=$4,
        email=$5, phone_us=$6, phone_intl=$7, website=$8, location=$9,
        linkedin=$10, instagram=$11, twitter=$12, facebook=$13, github=$14,
        youtube=$15, tiktok=$16, brand_name=$17, brand_tagline=$18
      WHERE user_id=$19
    `, [
      name, title, company, company_highlight,
      email, phone_us, phone_intl, website, location,
      linkedin, instagram, twitter, facebook, github, youtube, tiktok,
      brand_name, brand_tagline, req.user.id
    ]);

    const result = await db.query('SELECT * FROM cards WHERE user_id=$1', [req.user.id]);
    res.render('client/dashboard', { card: result.rows[0], user: req.user, error: null, success: 'Your card has been updated!' });
  } catch (err) {
    console.error(err);
    const result = await db.query('SELECT * FROM cards WHERE user_id=$1', [req.user.id]);
    res.render('client/dashboard', { card: result.rows[0], user: req.user, error: 'Error saving changes.', success: null });
  }
});

module.exports = router;
