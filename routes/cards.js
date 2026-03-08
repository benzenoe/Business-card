const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /:slug — public card view
router.get('/:slug', async (req, res, next) => {
  // Skip reserved paths
  const reserved = ['login', 'logout', 'admin', 'dashboard', 'assets', 'css', 'js'];
  if (reserved.includes(req.params.slug)) return next();

  const result = await db.query(
    'SELECT * FROM cards WHERE slug = $1 AND is_published = TRUE',
    [req.params.slug]
  );

  if (!result.rows[0]) return res.status(404).render('404');
  res.render('card', { card: result.rows[0] });
});

module.exports = router;
