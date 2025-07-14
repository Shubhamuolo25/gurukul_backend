const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getSignedUrl } = require('./S3service');
const User = require('../models/mongoDBModal').model;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '4h';

async function loginService(email, password) {
  if (!email || !password) {
    return { success: false, status: 400, error: 'Email and password required.' };
  }
  const user = await User.findOne({ email, delete: false });
  if (!user) {
    return { success: false, status: 402, error: 'Invalid credentials.' };
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { success: false, status: 402, error: 'Invalid credentials.' };
  }
  const accessToken = jwt.sign({ userId: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  // Use user.pic for S3 signed URL
  const picSignedUrl = await getSignedUrl(user.pic);
  return {
    success: true,
    status: 200,
    accessToken,
    user: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      picSignedUrl
    }
  };
}

module.exports = { loginService };