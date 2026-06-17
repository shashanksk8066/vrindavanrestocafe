const express = require('express');
const router = express.Router();
const { registerUser, getUserProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', verifyToken, registerUser);
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
