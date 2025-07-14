const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../models/mongoDBModal').model;
const { loginService } = require('../services/authService');
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '4h';

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error });
    }
    // Set cookie with expiry matching JWT expiry
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      expires: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
};

// Logout
exports.logout = (req, res) => {
  res.clearCookie('accessToken',{path: '/'});
  res.json({ success: true });
};


