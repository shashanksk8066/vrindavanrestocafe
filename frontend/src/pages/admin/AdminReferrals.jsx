import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';

const AdminReferrals = () => {
    const [referralConfig, setReferralConfig] = useState({
        enabled: false,
        requiredReferrals: 5,
        rewardType: 'coupon',
        discountType: 'flat',
        discountValue: 100,
        minOrderAmount: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mealPlans, setMealPlans] = useState([]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const refDoc = await getDoc(doc(db, 'appSettings', 'referralConfig'));
                if (refDoc.exists()) {
                    setReferralConfig(prev => ({ ...prev, ...refDoc.data() }));
                }
                const plansSnap = await getDocs(query(collection(db, 'subscriptionPlans'), where('status', '==', 'active')));
                const plans = [];
                plansSnap.forEach(d => plans.push({ id: d.id, ...d.data() }));
                setMealPlans(plans);
            } catch (error) {
                console.error("Error fetching referral settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'appSettings', 'referralConfig'), referralConfig);
            alert("Referral settings saved successfully!");
        } catch (error) {
            console.error("Error saving referral settings", error);
            alert("Failed to save referral settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">Loading referral settings...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Referral System</h1>
                <p className="text-gray-500">Configure how users earn rewards by referring others.</p>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3">
                            <input 
                                type="checkbox" 
                                checked={referralConfig.enabled}
                                onChange={(e) => setReferralConfig({...referralConfig, enabled: e.target.checked})}
                                className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-900">Enable Referral System</span>
                        </label>
                        
                        {referralConfig.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referrals Required for Reward</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={referralConfig.requiredReferrals} 
                                        onChange={e => setReferralConfig({...referralConfig, requiredReferrals: parseInt(e.target.value) || 1})} 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reward Type</label>
                                    <select 
                                        value={referralConfig.rewardType}
                                        onChange={e => setReferralConfig({...referralConfig, rewardType: e.target.value})}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="coupon">Discount Coupon</option>
                                        <option value="free_meal">Free Meal</option>
                                    </select>
                                </div>

                                {referralConfig.rewardType === 'free_meal' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Free Meal Plan</label>
                                        <select 
                                            value={referralConfig.freeMealPlanId || ''}
                                            onChange={e => setReferralConfig({...referralConfig, freeMealPlanId: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                            required
                                        >
                                            <option value="" disabled>Select a plan</option>
                                            {mealPlans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} ({p.mealType} - {p.mealCount} meals)</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">When a user reaches the required referrals, they will automatically be granted this exact subscription plan for free.</p>
                                    </div>
                                )}
                                
                                {referralConfig.rewardType === 'coupon' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Type</label>
                                            <select 
                                                value={referralConfig.discountType}
                                                onChange={e => setReferralConfig({...referralConfig, discountType: e.target.value})}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="flat">Flat Amount (₹)</option>
                                                <option value="percentage">Percentage (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                                            <input 
                                                type="number" 
                                                value={referralConfig.discountValue} 
                                                onChange={e => setReferralConfig({...referralConfig, discountValue: parseInt(e.target.value) || 0})} 
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (for Coupon)</label>
                                            <input 
                                                type="number" 
                                                value={referralConfig.minOrderAmount} 
                                                onChange={e => setReferralConfig({...referralConfig, minOrderAmount: parseInt(e.target.value) || 0})} 
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500" 
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminReferrals;
