const express = require('express');
const router = express.Router();
const { claimReward } = require('../controllers/rewardController');
const { verifyToken } = require('../middleware/auth');

// All reward operations require a user to be logged in
router.use(verifyToken);

router.post('/claim', claimReward);

module.exports = router;
