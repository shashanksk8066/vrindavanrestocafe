const express = require('express');
const router = express.Router();
const { createPlan, getPlans, updatePlan, deletePlan } = require('../controllers/planController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public or customer accessible
router.get('/', getPlans);

// Admin only routes
router.use(verifyToken, authorizeRoles('admin'));
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
