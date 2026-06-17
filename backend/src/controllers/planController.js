const { db } = require('../config/firebaseAdmin');

const createPlan = async (req, res) => {
    try {
        const { name, mealType, mealCount, price, cutoffTime, deliverySlots, subscriptionMenuIds, status } = req.body;
        
        const planRef = db.collection('subscriptionPlans').doc();
        await planRef.set({
            id: planRef.id,
            name,
            mealType,
            mealCount,
            price,
            cutoffTime,
            deliverySlots,
            subscriptionMenuIds: subscriptionMenuIds || [],
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        res.status(201).json({ success: true, message: 'Plan created successfully', id: planRef.id });
    } catch (error) {
        console.error('Create Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create plan' });
    }
};

const getPlans = async (req, res) => {
    try {
        const { status } = req.query;
        let query = db.collection('subscriptionPlans');
        
        // Customers might only query active plans, admins can query all
        if (status) {
            query = query.where('status', '==', status);
        }
        
        const snapshot = await query.get();
        const plans = [];
        snapshot.forEach(doc => {
            plans.push(doc.data());
        });

        res.status(200).json({ success: true, data: plans });
    } catch (error) {
        console.error('Get Plans Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch plans' });
    }
};

const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();

        await db.collection('subscriptionPlans').doc(id).update(updates);
        res.status(200).json({ success: true, message: 'Plan updated successfully' });
    } catch (error) {
        console.error('Update Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update plan' });
    }
};

const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('subscriptionPlans').doc(id).delete();
        res.status(200).json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        console.error('Delete Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete plan' });
    }
};

module.exports = { createPlan, getPlans, updatePlan, deletePlan };
