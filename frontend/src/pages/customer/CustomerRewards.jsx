import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { Gift, Award, Sparkles, CheckCircle2 } from 'lucide-react';

const CustomerRewards = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [totalSpent, setTotalSpent] = useState(0);
    const [tiers, setTiers] = useState([]);
    const [claimedRewards, setClaimedRewards] = useState([]);
    const [claimingTierId, setClaimingTierId] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Tiers
            const tiersSnap = await getDocs(query(collection(db, 'rewardTiers'), where('status', '==', 'active')));
            const tiersData = [];
            tiersSnap.forEach(doc => tiersData.push({ id: doc.id, ...doc.data() }));
            tiersData.sort((a, b) => a.thresholdAmount - b.thresholdAmount);
            setTiers(tiersData);

            // 2. Fetch User Spend
            let spent = 0;
            // Instant Orders
            const ordersQ = query(collection(db, 'instantOrders'), where('userId', '==', user.uid));
            const ordersSnap = await getDocs(ordersQ);
            ordersSnap.forEach(doc => {
                const data = doc.data();
                if (data.status === 'delivered' || data.status === 'completed') {
                    spent += (data.totalAmount || 0);
                }
            });

            // Subscriptions
            const subsQ = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));
            const subsSnap = await getDocs(subsQ);
            subsSnap.forEach(doc => {
                const data = doc.data();
                // Add price for active or completed subs
                if (data.status === 'active' || data.status === 'completed') {
                    spent += (data.price || 0);
                }
            });
            setTotalSpent(spent);

            // 3. Fetch Claimed Rewards
            const claimedQ = query(collection(db, 'userRewards'), where('userId', '==', user.uid));
            const claimedSnap = await getDocs(claimedQ);
            const claimedData = [];
            claimedSnap.forEach(doc => claimedData.push({ id: doc.id, ...doc.data() }));
            setClaimedRewards(claimedData);

        } catch (error) {
            console.error('Error fetching rewards data', error);
        } finally {
            setLoading(false);
        }
    };

    const generateRandomString = (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleClaim = async (tier) => {
        setClaimingTierId(tier.id);
        try {
            // 1. Generate unique coupon
            const randomCode = `RW-${user.uid.slice(0,4).toUpperCase()}-${generateRandomString(4)}`;
            
            const couponData = {
                code: randomCode,
                type: tier.type,
                discount: tier.discount,
                minOrderAmount: tier.minOrderAmount || 0,
                usageLimit: '1',
                userId: user.uid, // Only this user can use it
                status: 'active',
                applicableTo: 'all',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'coupons'), couponData);

            // 2. Save claim record
            await addDoc(collection(db, 'userRewards'), {
                userId: user.uid,
                tierId: tier.id,
                couponCode: randomCode,
                discountText: tier.type === 'flat' ? `Flat ₹${tier.discount} OFF` : `${tier.discount}% OFF`,
                claimedAt: new Date().toISOString()
            });

            // 3. Refresh data
            fetchData();
            alert(`Success! You unlocked a new coupon: ${randomCode}`);
        } catch (error) {
            console.error('Error claiming reward', error);
            alert('Failed to claim reward. Please try again.');
        } finally {
            setClaimingTierId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const nextTier = tiers.find(t => t.thresholdAmount > totalSpent);
    const progressPercentage = nextTier 
        ? Math.min(100, (totalSpent / nextTier.thresholdAmount) * 100) 
        : 100;

    return (
        <div className="p-4 md:p-0 max-w-2xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-4">
                        <Award className="w-6 h-6" />
                        <h1 className="text-xl font-bold">Vrindavan Rewards</h1>
                    </div>
                    
                    <p className="text-orange-100 text-sm font-medium mb-1">Total Lifetime Spend</p>
                    <h2 className="text-4xl font-black mb-6">₹{totalSpent.toLocaleString()}</h2>

                    {nextTier ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-bold text-orange-100">
                                <span>Progress to next reward</span>
                                <span>₹{nextTier.thresholdAmount.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                                <div 
                                    className="bg-white h-full rounded-full transition-all duration-1000 ease-out relative"
                                    style={{ width: `${progressPercentage}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/50 animate-pulse"></div>
                                </div>
                            </div>
                            <p className="text-xs font-semibold text-orange-100 pt-1">
                                Spend ₹{(nextTier.thresholdAmount - totalSpent).toLocaleString()} more to unlock {nextTier.type === 'flat' ? `₹${nextTier.discount}` : `${nextTier.discount}%`} OFF!
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm flex items-center space-x-3">
                            <Sparkles className="w-6 h-6 text-yellow-300" />
                            <p className="font-bold text-sm">You have unlocked all current reward tiers!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Milestones / Tiers */}
            <h3 className="font-bold text-gray-900 text-xl pt-4 px-2">Reward Milestones</h3>
            <div className="space-y-4">
                {tiers.map(tier => {
                    const isClaimed = claimedRewards.some(r => r.tierId === tier.id);
                    const isEligible = totalSpent >= tier.thresholdAmount && !isClaimed;

                    return (
                        <div key={tier.id} className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between transition-all ${isEligible ? 'border-orange-300 shadow-orange-100 scale-[1.02]' : 'border-gray-100'}`}>
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                    isClaimed ? 'bg-green-100 text-green-600' : 
                                    isEligible ? 'bg-orange-100 text-orange-600' : 
                                    'bg-gray-100 text-gray-400'
                                }`}>
                                    {isClaimed ? <CheckCircle2 className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">
                                        {tier.type === 'flat' ? `Flat ₹${tier.discount} OFF` : `${tier.discount}% OFF`}
                                    </h4>
                                    <p className="text-sm font-semibold text-gray-500">Spend ₹{tier.thresholdAmount.toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                {isClaimed ? (
                                    <span className="px-3 py-1.5 bg-green-50 text-green-700 font-bold text-xs rounded-lg border border-green-200">
                                        Claimed
                                    </span>
                                ) : isEligible ? (
                                    <button 
                                        onClick={() => handleClaim(tier)}
                                        disabled={claimingTierId === tier.id}
                                        className="px-4 py-2 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-700 shadow-md transition-colors disabled:opacity-50"
                                    >
                                        {claimingTierId === tier.id ? 'Claiming...' : 'Claim Reward'}
                                    </button>
                                ) : (
                                    <span className="px-3 py-1.5 bg-gray-50 text-gray-400 font-bold text-xs rounded-lg border border-gray-200 flex items-center">
                                        Locked
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {tiers.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        No rewards available at the moment.
                    </div>
                )}
            </div>

            {/* Claimed Coupons List */}
            {claimedRewards.length > 0 && (
                <>
                    <h3 className="font-bold text-gray-900 text-xl pt-8 px-2">Your Coupons</h3>
                    <div className="space-y-3">
                        {claimedRewards.map(reward => (
                            <div key={reward.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Coupon Code</span>
                                    <div className="font-black text-xl text-gray-900 tracking-wider">
                                        {reward.couponCode}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600 mb-1">{reward.discountText}</div>
                                    <div className="text-xs text-gray-500 font-semibold">Copy code at checkout</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerRewards;
