const jwt = require('jsonwebtoken');
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';

// Middleware to verify JWT access token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['Authorization'];
  let token = null;
  if (authHeader && authHeader.split(' ')[1] && authHeader.split(' ')[1] !== 'null' && authHeader.split(' ')[1] !== 'undefined') {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.user = payload;
    next();
  });
}

module.exports = { authenticateToken };

