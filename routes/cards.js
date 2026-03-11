const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /manifest/:slug.json — PWA manifest per card
router.get('/manifest/:slug.json', async (req, res) => {
  const result = await db.query(
    'SELECT * FROM cards WHERE slug = $1 AND is_published = TRUE',
    [req.params.slug]
  );
  const card = result.rows[0];
  if (!card) return res.status(404).json({ error: 'Not found' });

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const icons = card.headshot_url ? [
    { src: card.headshot_url, sizes: '192x192', type: 'image/jpeg' },
    { src: card.headshot_url, sizes: '512x512', type: 'image/jpeg' }
  ] : [];

  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    name: card.name + (card.company ? ` | ${card.company}` : ''),
    short_name: card.name.split(' ')[0],
    start_url: `${baseUrl}/${card.slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: card.bg_color_start || '#1a3e5c',
    theme_color: card.primary_color || '#00a8e1',
    icons
  });
});

// GET /:slug — public card view
router.get('/:slug', async (req, res, next) => {
  // Skip reserved paths
  const reserved = ['login', 'logout', 'admin', 'dashboard', 'assets', 'css', 'js', 'manifest', 'sw.js'];
  if (reserved.includes(req.params.slug)) return next();

  const result = await db.query(
    'SELECT * FROM cards WHERE slug = $1 AND is_published = TRUE',
    [req.params.slug]
  );

  if (!result.rows[0]) return res.status(404).render('404');
  res.render('card', { card: result.rows[0] });
});

module.exports = router;
