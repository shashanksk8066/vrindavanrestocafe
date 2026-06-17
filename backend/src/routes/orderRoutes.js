const express = require('express');
const router = express.Router();
const { reserveCoupon, releaseCoupon, createPayment, verifyPayment, bookSubscriptionMeal, createInstantPayment, verifyInstantPayment, createAddonPayment, verifyAddonPayment, createDineInPayment, verifyDineInPayment } = require('../controllers/orderController');
const { verifyToken } = require('../middleware/auth');

// Public Dine-In routes (No login required)
router.post('/dine-in/create', createDineInPayment);
router.post('/dine-in/verify', verifyDineInPayment);

// All other order operations require a user to be logged in
// Coupon Reservations (Public so unauthenticated dine-in can use it)
router.post('/reserve-coupon', reserveCoupon);
router.post('/release-coupon', releaseCoupon);

router.use(verifyToken);

router.post('/create-payment', createPayment);
router.post('/verify-payment', verifyPayment);
router.post('/book-meal', bookSubscriptionMeal);
router.post('/create-addon-payment', createAddonPayment);
router.post('/verify-addon-payment', verifyAddonPayment);
router.post('/create-instant-payment', createInstantPayment);
router.post('/verify-instant-payment', verifyInstantPayment);

module.exports = router;
