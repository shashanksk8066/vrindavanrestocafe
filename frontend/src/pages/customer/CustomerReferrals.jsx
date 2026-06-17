import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { Gift, Share2, Copy, Users, CheckCircle2, ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerReferrals = () => {
    const { user, userData } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [referrals, setReferrals] = useState([]);
    const [referralConfig, setReferralConfig] = useState(null);
    const [earnedRewards, setEarnedRewards] = useState([]);
    const [claimingId, setClaimingId] = useState(null);

    useEffect(() => {
        if (!user || !userData?.referralCode) return;
        fetchData();
    }, [user, userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Config
            const refDoc = await getDoc(doc(db, 'appSettings', 'referralConfig'));
            if (refDoc.exists()) {
                setReferralConfig(refDoc.data());
            }

            // Fetch History
            const q = query(collection(db, 'referralHistory'), where('referrerCode', '==', userData.referralCode));
            const snap = await getDocs(q);
            const history = [];
            snap.forEach(d => history.push({ id: d.id, ...d.data() }));
            
            
            // Fetch Rewards
            const rQ = query(collection(db, 'userRewards'), where('userId', '==', user.uid));
            const rSnap = await getDocs(rQ);
            const rewards = [];
            rSnap.forEach(d => {
                const data = d.data();
                if (data.type === 'coupon' && data.title?.includes('Referral')) {
                    rewards.push({ id: d.id, ...data });
                } else if (data.type === 'free_meal_pending' || data.type === 'free_meal') {
                    rewards.push({ id: d.id, ...data });
                }
            });
            rewards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setEarnedRewards(rewards);

            // Sort by newest first
            history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setReferrals(history);
        } catch (error) {
            console.error('Error fetching referrals', error);
        } finally {
            setLoading(false);
        }
    };



    const handleClaimFreeMeal = async (rewardId) => {
        setClaimingId(rewardId);
        try {
            const token = await user.getIdToken();
            const res = await fetch('http://localhost:5050/api/rewards/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rewardId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to claim');

            alert('Free Meal successfully claimed! It is now active in your subscriptions.');
            fetchData();
        } catch (error) {
            console.error('Error claiming free meal:', error);
            alert(error.message || 'Failed to claim free meal');
        } finally {
            setClaimingId(null);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userData?.referralCode}`);
        alert('Referral link copied to clipboard!');
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const successfulCount = userData?.successfulReferrals || 0;
    const requiredCount = referralConfig?.requiredReferrals || 5;
    const progressCount = successfulCount % requiredCount;
    const progressPercentage = (progressCount / requiredCount) * 100;
    
    // Total rewards earned (just estimating based on multiples)
    const rewardsEarned = Math.floor(successfulCount / requiredCount);

    return (
        <div className="p-4 md:p-0 max-w-2xl mx-auto space-y-6 pb-20">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-black mb-2">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Profile
            </button>

            {/* Header / Hero */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-4">
                        <Gift className="w-6 h-6" />
                        <h1 className="text-xl font-bold">Refer & Earn</h1>
                    </div>
                    
                    <p className="text-indigo-100 text-sm font-medium mb-1">Total Successful Referrals</p>
                    <h2 className="text-4xl font-black mb-6">{successfulCount} <span className="text-xl font-normal text-indigo-200">friend{successfulCount !== 1 ? 's' : ''}</span></h2>

                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20 flex justify-between items-center mb-6">
                        <div>
                            <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Your Code</p>
                            <p className="text-2xl font-bold tracking-widest">{userData?.referralCode}</p>
                        </div>
                        <button 
                            onClick={copyLink}
                            className="bg-white text-indigo-600 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg font-bold flex items-center"
                        >
                            <Copy className="w-4 h-4 mr-2" /> Copy Link
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold text-indigo-100">
                            <span>Progress to next reward</span>
                            <span>{progressCount} / {requiredCount}</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                            <div 
                                className="bg-white h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{ width: `${progressPercentage}%` }}
                            >
                                <div className="absolute inset-0 bg-white/50 animate-pulse"></div>
                            </div>
                        </div>
                        <p className="text-xs font-semibold text-indigo-100 pt-1">
                            Invite {requiredCount - progressCount} more friend(s) to unlock a {referralConfig?.rewardType === 'free_meal' ? 'Free Meal' : 'Special Coupon'}!
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                        <Users className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{Math.max(referrals.length, successfulCount)}</p>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Signups</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mb-2">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">{rewardsEarned}</p>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Rewards Won</p>
                </div>
            </div>


            {/* Earned Rewards */}
            {earnedRewards.length > 0 && (
                <>
                    <h3 className="font-bold text-gray-900 text-xl pt-4 px-2">Your Referral Rewards</h3>
                    <div className="space-y-3">
                        {earnedRewards.map(reward => (
                            <div key={reward.id} className="bg-white rounded-2xl p-5 border shadow-sm flex flex-col md:flex-row md:items-center justify-between transition-all border-indigo-100">
                                <div className="flex items-start space-x-4 mb-4 md:mb-0">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-500">
                                        <Gift className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">{reward.title}</h4>
                                        <p className="text-sm text-gray-500">{reward.description}</p>
                                        {reward.type === 'coupon' && (
                                            <div className="mt-2 inline-block bg-gray-100 text-gray-800 font-mono px-3 py-1 rounded border border-gray-200">
                                                Code: {reward.code}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    {reward.type === 'free_meal_pending' && !reward.isClaimed ? (
                                        <button 
                                            onClick={() => handleClaimFreeMeal(reward.id)}
                                            disabled={claimingId === reward.id}
                                            className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                                        >
                                            {claimingId === reward.id ? 'Claiming...' : 'Claim Free Meal'}
                                        </button>
                                    ) : reward.isClaimed ? (
                                        <span className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200">
                                            <CheckCircle2 className="w-5 h-5 mr-2" /> Claimed
                                        </span>
                                    ) : reward.type === 'coupon' ? (
                                        <span className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200">
                                            Active Coupon
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* History */}
            <h3 className="font-bold text-gray-900 text-xl pt-4 px-2">Referral History</h3>
            <div className="space-y-3">
                {referrals.map(ref => (
                    <div key={ref.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">{ref.referredUserName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                            {ref.status === 'subscribed' ? (
                                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Successful
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                                    Registered
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {referrals.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                        <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">You haven't referred anyone yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Share your link to start earning!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerReferrals;
