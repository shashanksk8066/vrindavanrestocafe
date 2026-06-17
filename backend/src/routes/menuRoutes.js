const express = require('express');
const router = express.Router();
const {
    getSubscriptionMenu, createSubscriptionMenu, updateSubscriptionMenu, deleteSubscriptionMenu,
    getMainMenu, createMainMenu, updateMainMenu, deleteMainMenu
} = require('../controllers/menuController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public endpoints
router.get('/subscription', getSubscriptionMenu);
router.get('/main', getMainMenu);

// Admin endpoints
router.use(verifyToken, authorizeRoles('admin'));

router.post('/subscription', createSubscriptionMenu);
router.put('/subscription/:id', updateSubscriptionMenu);
router.delete('/subscription/:id', deleteSubscriptionMenu);

router.post('/main', createMainMenu);
router.put('/main/:id', updateMainMenu);
router.delete('/main/:id', deleteMainMenu);

module.exports = router;
