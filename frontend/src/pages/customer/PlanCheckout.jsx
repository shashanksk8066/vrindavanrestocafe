import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { X, ArrowLeft, Info, Calendar } from 'lucide-react';
import LoginPopup from '../../components/LoginPopup';

const PlanCheckout = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    // Redirect back if no state
    useEffect(() => {
        if (!state || !state.plan) {
            navigate('/plans');
        }
    }, [state, navigate]);

    const plan = state?.plan;
    const subscriptionMenu = state?.subscriptionMenu || [];
    
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [groupSize] = useState(state?.groupSize || 1);

    if (!plan) return null;

    const totalAmount = Math.max(0, (plan.price * groupSize * (groupSize > 1 ? 0.9 : 1)));

    const getSessionId = () => {
        let sid = localStorage.getItem('checkout_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('checkout_session_id', sid);
        }
        return sid;
    };

    const handleApplyCoupon = async () => {
        if (!couponCodeInput.trim()) return;
        setApplyingCoupon(true);
        setCouponError('');
        try {
            const sid = getSessionId();
            const res = await fetch(`http://localhost:5050/api/orders/reserve-coupon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ couponCode: couponCodeInput.toUpperCase().trim(), sessionId: sid })
            });
            const data = await res.json();
            
            if (!res.ok) {
                setCouponError(data.message || 'Invalid coupon code');
                setAppliedCoupon(null);
                return;
            }

            const couponData = data.coupon;
            if (totalAmount < couponData.minOrderAmount) {
                setCouponError(`Minimum order amount should be ₹${couponData.minOrderAmount}`);
                setAppliedCoupon(null);
            } else {
                let discountValue = 0;
                if (couponData.type === 'flat') {
                    discountValue = couponData.discount;
                } else if (couponData.type === 'percentage') {
                    discountValue = Math.round((totalAmount * couponData.discount) / 100);
                }
                setAppliedCoupon({ ...couponData, discountValue });
            }
        } catch (error) {
            console.error("Error applying coupon", error);
            setCouponError(error.message || 'Error verifying coupon');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = async () => {
        if (appliedCoupon) {
            try {
                const sid = getSessionId();
                await fetch(`http://localhost:5050/api/orders/release-coupon`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ couponCode: appliedCoupon.code, sessionId: sid })
                });
            } catch (error) {
                console.error("Error releasing coupon", error);
            }
        }
        setAppliedCoupon(null);
        setCouponCodeInput('');
        setCouponError('');
    };

    const handleBuyPlan = async () => {
        if (!user) {
            setShowLoginPopup(true);
            return;
        }
        setIsPurchasing(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`http://localhost:5050/api/orders/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    planId: plan.id,
                    groupSize: groupSize,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    sessionId: getSessionId()
                })
            });
            const data = await res.json();
            
            if (data.success && data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                alert("Payment initiation failed: " + (data.message || 'Unknown error'));
                setIsPurchasing(false);
            }
        } catch (error) {
            console.error("Purchase error", error);
            alert("Network error, could not reach the server.");
            setIsPurchasing(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-black mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>

            <h1 className="text-2xl font-bold mb-6">Checkout</h1>

            {/* Plan Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-orange-500" /> Plan Details
                    </h2>
                </div>
                <div className="p-5">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Plan Name</p>
                                <p className="font-bold text-gray-900">{plan.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1">Meal Type</p>
                                <p className="font-bold text-gray-900 capitalize">{plan.mealType}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Meals</p>
                                <p className="font-bold text-gray-900">{plan.mealCount} Meals</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1">Daily Cutoff</p>
                                <p className="font-bold text-gray-900">{plan.cutoffTime}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900">Order Summary</h2>
                </div>
                <div className="p-5">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="font-medium text-gray-800 text-sm">Plan Price</span>
                            <span className="font-bold text-gray-900">₹{plan.price}</span>
                        </div>
                        {groupSize > 1 && (
                            <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                                <span className="font-medium text-gray-800 text-sm">Group Size (People)</span>
                                <span className="font-bold text-gray-900">{groupSize}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500 font-medium text-sm">Base Total</span>
                            <span className="font-bold text-gray-900 text-sm">₹{plan.price * groupSize}</span>
                        </div>
                        {groupSize > 1 && (
                            <div className="flex justify-between items-center text-green-600 mb-1">
                                <span className="font-medium text-sm">Group Discount (10%)</span>
                                <span className="font-bold text-sm">-₹{Math.round((plan.price * groupSize) * 0.10)}</span>
                            </div>
                        )}

                        {/* Coupon Section */}
                        <div className="pb-3 border-b border-gray-50 mb-3 mt-3">
                            {!appliedCoupon ? (
                                <div>
                                    <div className="relative group">
                                        <input 
                                            type="text" 
                                            value={couponCodeInput}
                                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                                            placeholder="Have a coupon code?" 
                                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl text-sm focus:ring-1 focus:ring-gray-200 focus:bg-white transition-all outline-none uppercase font-semibold tracking-wider placeholder:tracking-normal placeholder:normal-case placeholder:font-normal placeholder:text-gray-400"
                                        />
                                        <button 
                                            onClick={handleApplyCoupon}
                                            disabled={applyingCoupon || !couponCodeInput.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 text-orange-600 font-bold text-sm hover:text-orange-700 disabled:opacity-50 disabled:hover:text-orange-600 transition-colors"
                                        >
                                            {applyingCoupon ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                    {couponError && <p className="text-red-500 text-xs mt-2 ml-1 font-medium">{couponError}</p>}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                                    <div>
                                        <p className="text-green-800 font-bold text-sm">{appliedCoupon.code} Applied</p>
                                        <p className="text-green-600 text-xs">You saved ₹{appliedCoupon.discountValue.toFixed(2)}</p>
                                    </div>
                                    <button 
                                        onClick={handleRemoveCoupon}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-500 font-medium text-sm">Delivery Fee</span>
                            <span className="font-bold text-green-600 text-sm">₹0 (Free)</span>
                        </div>
                        
                        {appliedCoupon && (
                            <div className="flex justify-between items-center text-green-600 mb-2">
                                <span className="font-medium text-sm">Discount ({appliedCoupon.code})</span>
                                <span className="font-bold text-sm">-₹{appliedCoupon.discountValue.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-gray-600 font-medium">To Pay</span>
                            <span className="text-2xl font-black text-orange-600">
                                ₹{Math.max(0, (plan.price * groupSize * (groupSize > 1 ? 0.9 : 1)) - (appliedCoupon ? appliedCoupon.discountValue : 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleBuyPlan}
                disabled={isPurchasing}
                className="w-full bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 hover:bg-[#FF8A00] hover:-translate-y-0.5 font-bold py-3.5 rounded-xl transition-all mt-6 disabled:opacity-50 disabled:transform-none"
            >
                {isPurchasing ? 'Processing...' : 'Proceed to Pay'}
            </button>

            <LoginPopup 
                isOpen={showLoginPopup} 
                onClose={() => setShowLoginPopup(false)} 
                message="Please login or create an account to subscribe to a meal plan." 
            />
        </div>
    );
};

export default PlanCheckout;
