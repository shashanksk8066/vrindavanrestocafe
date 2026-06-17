const { db } = require('../config/firebaseAdmin');

exports.claimReward = async (req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.user.uid;

        if (!rewardId) {
            return res.status(400).json({ success: false, message: 'Reward ID is required' });
        }

        // Run this in a transaction to prevent double claiming
        await db.runTransaction(async (transaction) => {
            const rewardRef = db.collection('userRewards').doc(rewardId);
            const rewardDoc = await transaction.get(rewardRef);

            if (!rewardDoc.exists) {
                throw new Error('Reward not found');
            }

            const rewardData = rewardDoc.data();

            if (rewardData.userId !== userId) {
                throw new Error('Unauthorized to claim this reward');
            }

            if (rewardData.isClaimed) {
                throw new Error('Reward has already been claimed');
            }

            if (rewardData.type !== 'free_meal_pending') {
                throw new Error('This reward cannot be claimed manually');
            }

            if (!rewardData.planId) {
                throw new Error('Invalid reward: No plan associated');
            }

            // Get the plan details
            const planRef = db.collection('subscriptionPlans').doc(rewardData.planId);
            const planDoc = await transaction.get(planRef);

            if (!planDoc.exists) {
                throw new Error('The associated subscription plan no longer exists');
            }

            const planData = planDoc.data();

            // Create the subscription
            const freeSubRef = db.collection('subscriptions').doc();
            const subData = {
                id: freeSubRef.id,
                userId: userId,
                planId: planDoc.id,
                planName: planData.name + ' (Free Reward)',
                groupSize: 1,
                totalMeals: planData.mealCount,
                remainingMeals: planData.mealCount,
                mealType: planData.mealType,
                status: 'active',
                transactionId: 'CLAIMED-REWARD-' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            transaction.set(freeSubRef, subData);

            // Mark reward as claimed
            transaction.update(rewardRef, {
                isClaimed: true,
                claimedAt: new Date().toISOString(),
                subscriptionId: freeSubRef.id
            });
        });

        res.status(200).json({ success: true, message: 'Reward claimed successfully' });
    } catch (error) {
        console.error('Error claiming reward:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to claim reward' });
    }
};
