const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/login');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/login');
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).render('error', { message: 'Access denied' });
  next();
}

function requireClient(req, res, next) {
  if (!['admin', 'client'].includes(req.user?.role)) {
    return res.status(403).render('error', { message: 'Access denied' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin, requireClient };
