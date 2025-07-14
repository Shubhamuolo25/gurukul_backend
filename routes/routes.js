const express = require('express');
const router = express.Router();
const upload = require('../upload');
const { addUser, getUsers, deleteUser, searchUsers } = require('../Controller/user');
const authController = require('../controller/auth');
const { authenticateToken } = require('../middleware/authMiddleware');

// User routes (protected)
router.post('/api/users', authenticateToken, upload.single('pic'), (req, res, next) => addUser(req, res, next));
router.get('/api/users', authenticateToken, (req, res, next) => getUsers(req, res, next));
router.delete('/api/users/:id', authenticateToken, (req, res, next) => deleteUser(req, res, next));
router.get('/api/users/search', authenticateToken, (req, res, next) => searchUsers(req, res, next));

// Auth routes
router.post('/api/auth/login', authController.login);
router.post('/api/auth/logout', authController.logout);
router.get('/api/auth/validate', authenticateToken, (req, res) => {
  // If this middleware is reached, token is valid
  res.status(200).json({ valid: true });
});
// router.post('/api/auth/refresh', authController.refresh);

module.exports = router;
