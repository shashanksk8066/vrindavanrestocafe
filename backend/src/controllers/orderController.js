const { db, admin } = require('../config/firebaseAdmin');
const crypto = require('crypto');
const moment = require('moment'); // We should install moment for time checking




// Helper to check if current time is within booking window in IST
const isWithinBookingWindow = (openStr, cutoffStr) => {
    if (!cutoffStr) return true;
    
    // Parse cutoff time
    const cutoffMatch = cutoffStr.match(/(d+):(d+)s*(AM|PM)/i);
    if (!cutoffMatch) return true;

    let endHour = parseInt(cutoffMatch[1]);
    const endMin = parseInt(cutoffMatch[2]);
    const endPeriod = cutoffMatch[3].toUpperCase();

    if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod === 'AM' && endHour === 12) endHour = 0;

    // Parse open time (default 10:00 AM)
    let startHour = 10;
    let startMin = 0;
    const actualOpenStr = openStr || '10:00 AM';
    const openMatch = actualOpenStr.match(/(d+):(d+)s*(AM|PM)/i);
    if (openMatch) {
        startHour = parseInt(openMatch[1]);
        startMin = parseInt(openMatch[2]);
        const startPeriod = openMatch[3].toUpperCase();
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
    }

    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMins = now.getUTCMinutes();
    
    let istMins = utcMins + 30;
    let istHours = utcHours + 5;
    
    if (istMins >= 60) {
        istMins -= 60;
        istHours += 1;
    }
    if (istHours >= 24) {
        istHours -= 24;
    }

    const currentMins = istHours * 60 + istMins;
    const windowStartMins = startHour * 60 + startMin; 
    const windowEndMins = endHour * 60 + endMin;

    return currentMins >= windowStartMins && currentMins <= windowEndMins;
};

const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://vrindavanrestocafe.com';

const AUTH_URL = process.env.PHONEPE_ENV === 'UAT' 
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token' 
    : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';

const PG_BASE_URL = process.env.PHONEPE_ENV === 'UAT'
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
    : 'https://api.phonepe.com/apis/pg';

// Helper to get OAuth token
const getPhonePeToken = async () => {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('client_version', '1');
    params.append('grant_type', 'client_credentials');

    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });
    const data = await res.json();
    if (!data.access_token) throw new Error("Could not fetch PhonePe Token: " + JSON.stringify(data));
    return data.access_token;
};

// Step 1: Create a Payment Session with PhonePe (V2)

// ==========================================
// COUPON RESERVATION SYSTEM
// ==========================================

const reserveCoupon = async (req, res) => {
    try {
        const { couponCode, sessionId } = req.body;
        if (!couponCode || !sessionId) {
            return res.status(400).json({ success: false, message: 'Coupon code and session ID required' });
        }

        const couponQuery = await db.collection('coupons').where('code', '==', couponCode.toUpperCase().trim()).get();
        if (couponQuery.empty) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }

        const couponRef = couponQuery.docs[0].ref;
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(couponRef);
            if (!doc.exists) throw new Error('Coupon not found');
            
            const coupon = doc.data();
            if (coupon.status !== 'active') throw new Error('Coupon is inactive');

            // If it has unlimited usage, no need to reserve. Just return success.
            if (coupon.usageLimit === undefined || coupon.usageLimit === '') {
                return;
            }

            const now = Date.now();
            let reservations = coupon.reservations || [];
            
            // Filter out expired reservations
            reservations = reservations.filter(r => r.expiresAt > now);

            // Check if this session already has a valid reservation
            const existingResIndex = reservations.findIndex(r => r.sessionId === sessionId);
            if (existingResIndex !== -1) {
                // Refresh the reservation
                reservations[existingResIndex].expiresAt = now + 2 * 60 * 1000;
                transaction.update(couponRef, { reservations });
                return;
            }

            // Check if there's available capacity
            if (coupon.usageLimit - reservations.length <= 0) {
                throw new Error('This coupon is currently fully reserved by other users. Please try again in a few minutes.');
            }

            // Create new reservation
            reservations.push({
                sessionId,
                expiresAt: now + 2 * 60 * 1000
            });

            transaction.update(couponRef, { reservations });
        });

        res.status(200).json({ success: true, message: 'Coupon reserved successfully', coupon: couponQuery.docs[0].data() });
    } catch (error) {
        console.error('Error reserving coupon:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to reserve coupon' });
    }
};

const releaseCoupon = async (req, res) => {
    try {
        const { couponCode, sessionId } = req.body;
        if (!couponCode || !sessionId) {
            return res.status(400).json({ success: false, message: 'Coupon code and session ID required' });
        }

        const couponQuery = await db.collection('coupons').where('code', '==', couponCode.toUpperCase().trim()).get();
        if (couponQuery.empty) {
            return res.status(200).json({ success: true }); // Ignore if invalid
        }

        const couponRef = couponQuery.docs[0].ref;
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(couponRef);
            if (!doc.exists) return;
            
            const coupon = doc.data();
            if (coupon.usageLimit === undefined || coupon.usageLimit === '') return;

            const now = Date.now();
            let reservations = coupon.reservations || [];
            
            // Remove the user's reservation and any expired ones
            reservations = reservations.filter(r => r.expiresAt > now && r.sessionId !== sessionId);
            
            transaction.update(couponRef, { reservations });
        });

        res.status(200).json({ success: true, message: 'Reservation released' });
    } catch (error) {
        console.error('Error releasing coupon:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const createPayment = async (req, res) => {
    try {
        const { planId, groupSize = 1, couponCode, sessionId } = req.body;
        const { uid } = req.user;

        const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
        if (!planDoc.exists) return res.status(404).json({ success: false, message: 'Plan not found' });
        const plan = planDoc.data();

        // Base amount
        const baseAmount = plan.price * groupSize;
        // 10% discount if group > 1
        let finalAmount = groupSize > 1 ? baseAmount * 0.9 : baseAmount;

        // Apply Coupon if provided
        if (couponCode) {
            const couponsSnapshot = await db.collection('coupons').where('code', '==', couponCode.toUpperCase().trim()).get();
            if (!couponsSnapshot.empty) {
                const coupon = couponsSnapshot.docs[0].data();
                if (coupon.status === 'active' && finalAmount >= coupon.minOrderAmount) {
                    if (coupon.usageLimit !== undefined && coupon.usageLimit !== '') {
                        // Check reservations
                        const now = Date.now();
                        const reservations = (coupon.reservations || []).filter(r => r.expiresAt > now);
                        const hasActiveReservation = sessionId && reservations.some(r => r.sessionId === sessionId);
                        
                        if (!hasActiveReservation && (coupon.usageLimit - reservations.length <= 0)) {
                            return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached or is currently reserved.' });
                        }
                    }
                    
                    let discountApplied = 0;
                    if (coupon.type === 'flat') {
                        discountApplied = coupon.discount;
                    } else if (coupon.type === 'percentage') {
                        discountApplied = (finalAmount * coupon.discount) / 100;
                    }
                    finalAmount = Math.max(0, finalAmount - discountApplied);
                }
            }
        }

        const amountInPaise = Math.round(finalAmount * 100);
        const transactionId = 'T' + Date.now();
        const token = await getPhonePeToken();

        const payload = {
            merchantOrderId: transactionId,
            amount: amountInPaise,
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: {
                    redirectUrl: `${FRONTEND_URL}/payment-callback?transactionId=${transactionId}&planId=${planId}&groupSize=${groupSize}`
                }
            }
        };

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl) || data.state === 'PENDING') {
            const redirectUrl = data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl);
            if (redirectUrl) {
                return res.status(200).json({ success: true, redirectUrl });
            }
        }
        
        console.error('PhonePe Error:', data);
        res.status(400).json({ success: false, message: 'Payment initiation failed', details: data });
    } catch (error) {
        console.error('Create Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment' });
    }
};

// Step 2: Verify PhonePe Payment and Activate Subscription (V2)
const verifyPayment = async (req, res) => {
    try {
        const { transactionId, planId, groupSize = 1 } = req.body;
        const { uid } = req.user;
        const token = await getPhonePeToken();

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/order/${transactionId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.state === 'COMPLETED' || data.state === 'PAYMENT_SUCCESS') {
            const existingSub = await db.collection('subscriptions').where('transactionId', '==', transactionId).get();
            if (!existingSub.empty) {
                return res.status(200).json({ success: true, message: 'Already activated' });
            }

            const planDoc = await db.collection('subscriptionPlans').doc(planId).get();
            const plan = planDoc.data();

            const parsedGroupSize = parseInt(groupSize) || 1;

            const subscriptionRef = db.collection('subscriptions').doc();
                        await subscriptionRef.set({
                id: subscriptionRef.id,
                userId: uid,
                planId,
                planName: plan.name,
                groupSize: parsedGroupSize,
                totalMeals: plan.mealCount * parsedGroupSize,
                remainingMeals: plan.mealCount * parsedGroupSize,
                mealType: plan.mealType,
                status: 'active',
                transactionId: transactionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Handle Referral System logic
            if (plan.mealCount * parsedGroupSize > 10) {
                try {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Check if they were referred and haven't triggered a reward yet
                        if (userData.referredBy && !userData.referralRewarded) {
                            // Find the referrer
                            const referrersSnapshot = await db.collection('users').where('referralCode', '==', userData.referredBy).get();
                            
                            if (!referrersSnapshot.empty) {
                                const referrerDoc = referrersSnapshot.docs[0];
                                const referrerId = referrerDoc.id;
                                const referrerData = referrerDoc.data();
                                
                                // Mark this user as rewarded so they don't trigger it again for future purchases
                                await db.collection('users').doc(uid).update({ referralRewarded: true });
                                
                                // Increment referrer's successful count
                                const currentCount = referrerData.successfulReferrals || 0;
                                const newCount = currentCount + 1;
                                
                                await db.collection('users').doc(referrerId).update({ successfulReferrals: newCount });
                                
                                                                // Check if threshold is met
                                const settingsDoc = await db.collection('appSettings').doc('referralConfig').get();
                                if (settingsDoc.exists) {
                                    const settings = settingsDoc.data();
                                    if (settings.enabled && newCount > 0 && newCount % (settings.requiredReferrals || 5) === 0) {
                                        // Issue reward
                                        if (settings.rewardType === 'coupon') {
                                            const code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                                            await db.collection('coupons').add({
                                                code: code,
                                                type: settings.discountType || 'flat',
                                                discount: settings.discountValue || 100,
                                                minOrderAmount: settings.minOrderAmount || 0,
                                                usageLimit: 1,
                                                userId: referrerId,
                                                status: 'active',
                                                createdAt: new Date().toISOString()
                                            });
                                            await db.collection('userRewards').add({
                                                userId: referrerId,
                                                title: 'Referral Bonus Coupon',
                                                description: `You earned ${settings.discountType === 'flat' ? '₹' : ''}${settings.discountValue}${settings.discountType === 'percentage' ? '%' : ''} off!`,
                                                type: 'coupon',
                                                code: code,
                                                createdAt: new Date().toISOString()
                                            });
                                        } else if (settings.rewardType === 'free_meal' && settings.freeMealPlanId) {
                                            // Get the free meal plan
                                            const freePlanDoc = await db.collection('subscriptionPlans').doc(settings.freeMealPlanId).get();
                                            if (freePlanDoc.exists) {
                                                const freePlan = freePlanDoc.data();
                                                
                                                await db.collection('userRewards').add({
                                                    userId: referrerId,
                                                    title: 'Free Meal Plan',
                                                    description: `You earned a free ${freePlan.name} for referring friends!`,
                                                    type: 'free_meal_pending',
                                                    planId: settings.freeMealPlanId,
                                                    isClaimed: false,
                                                    createdAt: new Date().toISOString()
                                                });
                                            }
                                        }
                                    }
                                }
                                
                                // Update referralHistory status
                                await db.collection('referralHistory').doc(uid).update({ status: 'subscribed' }).catch(() => {});

                            }
                        }
                    }
                } catch (refErr) {
                    console.error("Error processing referral logic:", refErr);
                }
            }

            res.status(200).json({ success: true, message: 'Subscription purchased', subscriptionId: subscriptionRef.id });
        } else {
            res.status(400).json({ success: false, message: 'Payment failed or pending', details: data });
        }
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

// Book a meal for a subscription
const bookSubscriptionMeal = async (req, res) => {
    try {
        const { subscriptionId, menuItems, addOnItems, date, deliverySlot, addressId } = req.body;
        const { uid } = req.user;
        const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (!subDoc.exists) return res.status(404).json({ success: false, message: 'Subscription not found' });
        
        const subscription = subDoc.data();
        if (subscription.userId !== uid) return res.status(403).json({ success: false, message: 'Unauthorized' });
        
        const mealsToBook = menuItems ? menuItems.length : 1;
        if (subscription.remainingMeals < mealsToBook) return res.status(400).json({ success: false, message: 'Not enough meals left' });

        // Check if user already booked today
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookingsSnapshot = await db.collection('subscriptionBookings')
            .where('subscriptionId', '==', subscriptionId)
            .get();

        let hasBookedToday = false;
        existingBookingsSnapshot.forEach(doc => {
            const bookingDate = new Date(doc.data().date);
            if (bookingDate >= startOfDay && bookingDate <= endOfDay) {
                hasBookedToday = true;
            }
        });

        if (hasBookedToday) {
            return res.status(400).json({ success: false, message: 'Only one booking allowed per day' });
        }

        // Validate Cutoff time
        const planDoc = await db.collection('subscriptionPlans').doc(subscription.planId).get();
        const plan = planDoc.data();
        if (plan && plan.cutoffTime && !isWithinBookingWindow(plan.bookingOpenTime, plan.cutoffTime)) {
            return res.status(400).json({ success: false, message: `Meal booking is only available between ${plan.bookingOpenTime || "10:00 AM"} and ${plan.cutoffTime}.` });
        }
        
        // If there are addons, verify payment...
        
        const bookingRef = db.collection('subscriptionBookings').doc();
        await bookingRef.set({
            id: bookingRef.id,
            subscriptionId,
            userId: uid,
            menuItems,
            addOnItems: addOnItems || [],
            date: new Date(date).toISOString(),
            deliverySlot,
            addressId,
            status: 'pending', // pending, assigned, delivered
            createdAt: new Date().toISOString()
        });

        // Decrease meal count and auto-inactivate if out of meals
        const newRemainingMeals = subscription.remainingMeals - mealsToBook;
        await db.collection('subscriptions').doc(subscriptionId).update({
            remainingMeals: newRemainingMeals,
            ...(newRemainingMeals <= 0 && { status: 'inactive' }),
            updatedAt: new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Meal booked successfully' });
    } catch (error) {
        console.error('Book Meal Error:', error);
        res.status(500).json({ success: false, message: 'Failed to book meal' });
    }
};

// Step 1: Create Instant Payment
const createInstantPayment = async (req, res) => {
    try {
        const { items, addressId, couponCode, freeFood } = req.body;
        const { uid } = req.user;

        // Calculate total amount
        let totalAmount = 0;
        items.forEach(item => {
            totalAmount += ((item.price + (item.parcelCharges || 0)) * item.quantity);
        });

        if (totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid order amount' });
        }

        // Apply Coupon if provided
        let discountApplied = 0;
        if (couponCode) {
            const couponsSnapshot = await db.collection('coupons').where('code', '==', couponCode.toUpperCase().trim()).get();
            if (!couponsSnapshot.empty) {
                const coupon = couponsSnapshot.docs[0].data();
                if (coupon.status === 'active' && totalAmount >= coupon.minOrderAmount) {
                    if (coupon.usageLimit !== undefined && coupon.usageLimit !== '') {
                        // Check reservations
                        const now = Date.now();
                        const reservations = (coupon.reservations || []).filter(r => r.expiresAt > now);
                        const hasActiveReservation = req.body.sessionId && reservations.some(r => r.sessionId === req.body.sessionId);
                        
                        if (!hasActiveReservation && (coupon.usageLimit - reservations.length <= 0)) {
                            return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached or is currently reserved.' });
                        }
                    }
                    if (coupon.type === 'flat') {
                        discountApplied = coupon.discount;
                    } else if (coupon.type === 'percentage') {
                        discountApplied = (totalAmount * coupon.discount) / 100;
                    }
                    if (discountApplied > totalAmount) discountApplied = totalAmount;
                }
            }
        }

        const finalAmount = Math.max(0, totalAmount - discountApplied);
        const amountInPaise = Math.round(finalAmount * 100);
        const transactionId = 'I' + Date.now();
        const token = await getPhonePeToken();

        // Temporarily save this pending instant booking
        await db.collection('pendingInstantBookings').doc(transactionId).set({
            transactionId,
            userId: uid,
            items,
            addressId,
            amount: finalAmount,
            originalAmount: totalAmount,
            discountApplied,
            couponCode: couponCode || null,
            freeFood: freeFood || null,
            sessionId: req.body.sessionId || null,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        // PhonePe Pay Payload (V2)
        const payload = {
            merchantOrderId: transactionId,
            amount: amountInPaise,
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: {
                    redirectUrl: `${FRONTEND_URL}/payment-callback?transactionId=${transactionId}&type=instantBooking`
                }
            }
        };

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl) || data.state === 'PENDING') {
            const redirectUrl = data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl);
            if (redirectUrl) {
                return res.status(200).json({ success: true, redirectUrl, transactionId });
            }
        }
        
        console.error('PhonePe Error:', data);
        res.status(400).json({ success: false, message: 'Payment initiation failed', details: data });
    } catch (error) {
        console.error('Create Instant Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
};

// Step 2: Verify Instant Payment (Webhook or Polling)
const verifyInstantPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const { uid } = req.user;

        const token = await getPhonePeToken();

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/order/${transactionId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.state === 'COMPLETED' || data.state === 'PAYMENT_SUCCESS') {
            const pendingDoc = await db.collection('pendingInstantBookings').doc(transactionId).get();
            if (!pendingDoc.exists) {
                return res.status(404).json({ success: false, message: 'Pending instant booking not found' });
            }

            const pendingBooking = pendingDoc.data();
            if (pendingBooking.status === 'COMPLETED') {
                return res.status(200).json({ success: true, message: 'Already processed' });
            }
            if (pendingBooking.userId !== uid) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            // Create actual instant order
            const orderRef = db.collection('instantOrders').doc();
            await orderRef.set({
                id: orderRef.id,
                userId: uid,
                items: pendingBooking.items,
                addressId: pendingBooking.addressId,
                totalAmount: pendingBooking.amount,
                originalAmount: pendingBooking.originalAmount || pendingBooking.amount,
                discountApplied: pendingBooking.discountApplied || 0,
                couponCode: pendingBooking.couponCode || null,
                freeFood: pendingBooking.freeFood || null,
                status: 'pending',
                transactionId: transactionId,
                createdAt: new Date().toISOString()
            });

            // Mark pending as completed
            await db.collection('pendingInstantBookings').doc(transactionId).update({
                status: 'COMPLETED',
                updatedAt: new Date().toISOString()
            });

            // Decrement coupon usage limit if applicable
            if (pendingBooking.couponCode) {
                const couponsSnapshot = await db.collection('coupons').where('code', '==', pendingBooking.couponCode).get();
                if (!couponsSnapshot.empty) {
                    const couponDoc = couponsSnapshot.docs[0];
                    const couponData = couponDoc.data();
                    if (couponData.usageLimit !== undefined && couponData.usageLimit !== '') {
                        let newReservations = couponData.reservations || [];
                        if (pendingBooking.sessionId) {
                            newReservations = newReservations.filter(r => r.sessionId !== pendingBooking.sessionId);
                        }
                        await couponDoc.ref.update({
                            usageLimit: admin.firestore.FieldValue.increment(-1),
                            reservations: newReservations
                        });
                    }
                }
            }

            return res.status(200).json({ success: true, message: 'Instant payment verified and order created' });
        } else {
            res.status(400).json({ success: false, message: 'Payment failed or pending', details: data });
        }
    } catch (error) {
        console.error('Verify Instant Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};


// Step 1: Create an Add-on Payment Session with PhonePe (V2)
const createAddonPayment = async (req, res) => {
    try {
        const { subscriptionId, menuItems, addOnItems, date, deliverySlot, addressId } = req.body;
        const { uid } = req.user;

        // Cutoff validation for add-on flow
        const subDoc = await db.collection('subscriptions').doc(subscriptionId).get();
        if (subDoc.exists) {
            const planDoc = await db.collection('subscriptionPlans').doc(subDoc.data().planId).get();
            const plan = planDoc.data();
            if (plan && plan.cutoffTime && !isWithinBookingWindow(plan.bookingOpenTime, plan.cutoffTime)) {
                return res.status(400).json({ success: false, message: `Meal booking is only available between ${plan.bookingOpenTime || "10:00 AM"} and ${plan.cutoffTime}.` });
            }
        }

        // Calculate total amount from addOnItems
        let totalAmount = 0;
        addOnItems.forEach(item => {
            totalAmount += ((item.price + (item.parcelCharges || 0)) * item.quantity);
        });

        if (totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid addon amount' });
        }

        const amountInPaise = Math.round(totalAmount * 100);
        const transactionId = 'T' + Date.now();
        const token = await getPhonePeToken();

        // Temporarily save this pending booking
        await db.collection('pendingBookings').doc(transactionId).set({
            transactionId,
            subscriptionId,
            userId: uid,
            menuItems,
            addOnItems,
            date,
            deliverySlot,
            addressId,
            amount: totalAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        const payload = {
            merchantOrderId: transactionId,
            amount: amountInPaise,
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: {
                    redirectUrl: `${FRONTEND_URL}/payment-callback?transactionId=${transactionId}&type=addonBooking`
                }
            }
        };

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl) || data.state === 'PENDING') {
            const redirectUrl = data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl);
            if (redirectUrl) {
                return res.status(200).json({ success: true, redirectUrl });
            }
        }
        
        console.error('PhonePe Error:', data);
        res.status(400).json({ success: false, message: 'Payment initiation failed', details: data });
    } catch (error) {
        console.error('Create Addon Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment' });
    }
};

// Step 2: Verify PhonePe Payment and complete Add-on Booking
const verifyAddonPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const { uid } = req.user;
        const token = await getPhonePeToken();

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/order/${transactionId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.state === 'COMPLETED' || data.state === 'PAYMENT_SUCCESS') {
            const pendingDoc = await db.collection('pendingBookings').doc(transactionId).get();
            if (!pendingDoc.exists) {
                return res.status(404).json({ success: false, message: 'Pending booking not found' });
            }

            const pendingBooking = pendingDoc.data();
            if (pendingBooking.status === 'COMPLETED') {
                return res.status(200).json({ success: true, message: 'Already processed' });
            }
            if (pendingBooking.userId !== uid) {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            const subDoc = await db.collection('subscriptions').doc(pendingBooking.subscriptionId).get();
            const subscription = subDoc.data();

            // Create actual booking
            const bookingRef = db.collection('subscriptionBookings').doc();
            await bookingRef.set({
                id: bookingRef.id,
                subscriptionId: pendingBooking.subscriptionId,
                userId: uid,
                menuItems: pendingBooking.menuItems,
                addOnItems: pendingBooking.addOnItems,
                date: new Date(pendingBooking.date).toISOString(),
                deliverySlot: pendingBooking.deliverySlot,
                addressId: pendingBooking.addressId,
                status: 'pending',
                transactionId: transactionId,
                createdAt: new Date().toISOString()
            });

            // Decrease meal count and auto-inactivate if out of meals
            const mealsToBook = pendingBooking.menuItems ? pendingBooking.menuItems.length : 1;
            const newRemainingMeals = subscription.remainingMeals - mealsToBook;
            await db.collection('subscriptions').doc(pendingBooking.subscriptionId).update({
                remainingMeals: newRemainingMeals,
                ...(newRemainingMeals <= 0 && { status: 'inactive' }),
                updatedAt: new Date().toISOString()
            });

            // Mark pending as completed
            await db.collection('pendingBookings').doc(transactionId).update({
                status: 'COMPLETED',
                updatedAt: new Date().toISOString()
            });

            res.status(200).json({ success: true, message: 'Meal booked with addons successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Payment failed or pending', details: data });
        }
    } catch (error) {
        console.error('Verify Addon Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

// Step 1: Create Dine-In Payment
const createDineInPayment = async (req, res) => {
    try {
        const { items, customerName, customerPhone, tableNumber, couponCode, requiresTableService, freeFood } = req.body;

        // Calculate total amount
        let totalAmount = 0;
        items.forEach(item => {
            totalAmount += (item.price * item.quantity);
        });

        if (totalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid order amount' });
        }

        // Apply Coupon if provided
        let discountApplied = 0;
        if (couponCode) {
            const couponsSnapshot = await db.collection('coupons').where('code', '==', couponCode.toUpperCase().trim()).get();
            if (!couponsSnapshot.empty) {
                const coupon = couponsSnapshot.docs[0].data();
                if (coupon.status === 'active' && totalAmount >= coupon.minOrderAmount) {
                    if (coupon.usageLimit !== undefined && coupon.usageLimit !== '') {
                        // Check reservations
                        const now = Date.now();
                        const reservations = (coupon.reservations || []).filter(r => r.expiresAt > now);
                        const hasActiveReservation = req.body.sessionId && reservations.some(r => r.sessionId === req.body.sessionId);
                        
                        if (!hasActiveReservation && (coupon.usageLimit - reservations.length <= 0)) {
                            return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached or is currently reserved.' });
                        }
                    }
                    if (coupon.type === 'flat') {
                        discountApplied = coupon.discount;
                    } else if (coupon.type === 'percentage') {
                        discountApplied = (totalAmount * coupon.discount) / 100;
                    }
                    if (discountApplied > totalAmount) discountApplied = totalAmount;
                }
            }
        }

        let finalAmount = Math.max(0, totalAmount - discountApplied);
        if (requiresTableService) {
            finalAmount += 20;
            totalAmount += 20; // For originalAmount tracking
        }
        
        const amountInPaise = Math.round(finalAmount * 100);
        const transactionId = 'D' + Date.now();
        const token = await getPhonePeToken();

        // Temporarily save this pending dine-in booking
        await db.collection('pendingDineInBookings').doc(transactionId).set({
            transactionId,
            customerName,
            customerPhone,
            tableNumber,
            items,
            amount: finalAmount,
            originalAmount: totalAmount,
            discountApplied,
            couponCode: couponCode || null,
            freeFood: freeFood || null,
            sessionId: req.body.sessionId || null,
            requiresTableService: requiresTableService || false,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        });

        // PhonePe Pay Payload (V2)
        const payload = {
            merchantOrderId: transactionId,
            amount: amountInPaise,
            paymentFlow: {
                type: "PG_CHECKOUT",
                merchantUrls: {
                    redirectUrl: `${FRONTEND_URL}/payment-callback?transactionId=${transactionId}&type=dineInBooking`
                }
            }
        };

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl) || data.state === 'PENDING') {
            const redirectUrl = data.redirectUrl || (data.paymentUrls && data.paymentUrls.redirectUrl);
            if (redirectUrl) {
                return res.status(200).json({ success: true, redirectUrl, transactionId });
            }
        }
        
        console.error('PhonePe Error:', data);
        res.status(400).json({ success: false, message: 'Payment initiation failed', details: data });
    } catch (error) {
        console.error('Create Dine-In Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
};

// Step 2: Verify Dine-In Payment
const verifyDineInPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const token = await getPhonePeToken();

        const response = await fetch(`${PG_BASE_URL}/checkout/v2/order/${transactionId}/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `O-Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.state === 'COMPLETED' || data.state === 'PAYMENT_SUCCESS') {
            const pendingDoc = await db.collection('pendingDineInBookings').doc(transactionId).get();
            if (!pendingDoc.exists) {
                return res.status(404).json({ success: false, message: 'Pending dine-in booking not found' });
            }

            const pendingBooking = pendingDoc.data();
            if (pendingBooking.status === 'COMPLETED') {
                return res.status(200).json({ success: true, message: 'Already processed', phone: pendingBooking.customerPhone });
            }

            // Create actual dine-in order
            const orderRef = db.collection('dineInOrders').doc();
            await orderRef.set({
                id: orderRef.id,
                customerName: pendingBooking.customerName,
                customerPhone: pendingBooking.customerPhone,
                tableNumber: pendingBooking.tableNumber,
                items: pendingBooking.items,
                totalAmount: pendingBooking.amount,
                originalAmount: pendingBooking.originalAmount || pendingBooking.amount,
                discountApplied: pendingBooking.discountApplied || 0,
                couponCode: pendingBooking.couponCode || null,
                freeFood: pendingBooking.freeFood || null,
                requiresTableService: pendingBooking.requiresTableService || false,
                status: 'received', // received, preparing, served
                transactionId: transactionId,
                createdAt: new Date().toISOString()
            });

            // Mark pending as completed
            await db.collection('pendingDineInBookings').doc(transactionId).update({
                status: 'COMPLETED',
                updatedAt: new Date().toISOString()
            });

            // Decrement coupon usage limit if applicable
            if (pendingBooking.couponCode) {
                const couponsSnapshot = await db.collection('coupons').where('code', '==', pendingBooking.couponCode).get();
                if (!couponsSnapshot.empty) {
                    const couponDoc = couponsSnapshot.docs[0];
                    const couponData = couponDoc.data();
                    if (couponData.usageLimit !== undefined && couponData.usageLimit !== '') {
                        let newReservations = couponData.reservations || [];
                        if (pendingBooking.sessionId) {
                            newReservations = newReservations.filter(r => r.sessionId !== pendingBooking.sessionId);
                        }
                        await couponDoc.ref.update({
                            usageLimit: admin.firestore.FieldValue.increment(-1),
                            reservations: newReservations
                        });
                    }
                }
            }

            return res.status(200).json({ success: true, message: 'Dine-In payment verified', phone: pendingBooking.customerPhone });
        } else {
            res.status(400).json({ success: false, message: 'Payment failed or pending', details: data });
        }
    } catch (error) {
        console.error('Verify Dine-In Payment Error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
};

module.exports = {
    reserveCoupon,
    releaseCoupon, 
    createPayment, 
    verifyPayment, 
    bookSubscriptionMeal, 
    createInstantPayment, 
    verifyInstantPayment, 
    createAddonPayment, 
    verifyAddonPayment,
    createDineInPayment,
    verifyDineInPayment
};
