import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { Calendar, CheckCircle2, Clock, Plus, Minus, Package, X, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoginPopup from '../../components/LoginPopup';

const Plans = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-plans'
    const [plans, setPlans] = useState([]);
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [highlightedPlan, setHighlightedPlan] = useState(null);
    const [groupPlanSize, setGroupPlanSize] = useState(2);
    const [selectedGroupPlanId, setSelectedGroupPlanId] = useState('');
    const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [showLoginPopup, setShowLoginPopup] = useState(false);

    const [mainMenu, setMainMenu] = useState([]);
    const [subscriptionMenu, setSubscriptionMenu] = useState([]);
    const navigate = useNavigate();

    // Coupon State
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    const fetchPlansAndSubs = async () => {
        setLoading(true);
        try {
            // Fetch available plans
            const plansQ = query(collection(db, 'subscriptionPlans'), where('status', '==', 'active'));
            const plansSnap = await getDocs(plansQ);
            const plansData = [];
            plansSnap.forEach(d => plansData.push({ id: d.id, ...d.data() }));
            setPlans(plansData);

            // Fetch my subscriptions
            if (user) {
                const subsQ = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));
                const subsSnap = await getDocs(subsQ);
                const subsData = [];
                subsSnap.forEach(d => {
                    const data = d.data();
                    if (data.remainingMeals !== undefined && data.remainingMeals <= 0 && data.status !== 'cancelled') {
                        data.status = 'completed';
                    }
                    subsData.push({ id: d.id, ...data });
                });
                
                // Sort active subscriptions at the top
                subsData.sort((a, b) => {
                    const aIsActive = a.status !== 'completed' && a.status !== 'cancelled';
                    const bIsActive = b.status !== 'completed' && b.status !== 'cancelled';
                    if (aIsActive && !bIsActive) return -1;
                    if (!aIsActive && bIsActive) return 1;
                    return 0; // if both are same, maintain order
                });
                
                setMySubscriptions(subsData);
            }

            // Fetch main menu for add-ons
            const menuQ = query(collection(db, 'mainMenu'), where('status', '==', 'active'));
            const menuSnap = await getDocs(menuQ);
            const menuData = [];
            menuSnap.forEach(d => menuData.push({ id: d.id, ...d.data() }));
            setMainMenu(menuData);

            // Fetch subscription menu
            const subMenuSnap = await getDocs(collection(db, 'subscriptionMenu'));
            const subMenuData = [];
            subMenuSnap.forEach(d => subMenuData.push({ id: d.id, ...d.data() }));
            setSubscriptionMenu(subMenuData);
        } catch (error) {
            console.error("Error fetching plans", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlansAndSubs();
    }, [user]);

    const handleBuyPlan = async (plan) => {
        if (!user) {
            setShowLoginPopup(true);
            return;
        }
        setIsPurchasing(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('http://localhost:5050/api/orders/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    planId: plan.id,
                    couponCode: appliedCoupon ? appliedCoupon.code : null
                })
            });
            const data = await res.json();
            
            if (data.success && data.redirectUrl) {
                // Redirect user to PhonePe Gateway
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

    const handleApplyCoupon = async () => {
        if (!couponCodeInput.trim()) return;
        setApplyingCoupon(true);
        setCouponError('');
        try {
            const q = query(collection(db, 'coupons'), where('code', '==', couponCodeInput.toUpperCase().trim()));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                setCouponError('Invalid coupon code');
                setAppliedCoupon(null);
            } else {
                const coupon = snapshot.docs[0].data();
                if (coupon.status !== 'active') {
                    setCouponError('This coupon is no longer active');
                    setAppliedCoupon(null);
                    return;
                }
                if (coupon.usageLimit !== undefined && coupon.usageLimit !== '' && coupon.usageLimit <= 0) {
                    setCouponError('This coupon usage limit has been reached');
                    setAppliedCoupon(null);
                    return;
                }
                const totalAmount = selectedPlan.price;
                if (totalAmount < coupon.minOrderAmount) {
                    setCouponError(`Minimum order of ₹${coupon.minOrderAmount} required`);
                    setAppliedCoupon(null);
                    return;
                }
                
                let discountValue = 0;
                if (coupon.type === 'flat') {
                    discountValue = coupon.discount;
                } else if (coupon.type === 'percentage') {
                    discountValue = Math.round((totalAmount * coupon.discount) / 100);
                }
                
                if (discountValue > totalAmount) discountValue = totalAmount;

                setAppliedCoupon({ ...coupon, discountValue });
                setCouponCodeInput('');
            }
        } catch (error) {
            console.error("Error applying coupon", error);
            setCouponError('Failed to apply coupon');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCodeInput('');
        setCouponError('');
    };



    const isBookingAllowed = (planId) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan || !plan.cutoffTime) return true;

        const cutoffMatch = plan.cutoffTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!cutoffMatch) return true;

        let endHour = parseInt(cutoffMatch[1]);
        let endMin = parseInt(cutoffMatch[2]);
        const endPeriod = cutoffMatch[3].toUpperCase();
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;

        let startHour = 10;
        let startMin = 0;
        const openTimeStr = plan.bookingOpenTime || '10:00 AM';
        const openMatch = openTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (openMatch) {
            startHour = parseInt(openMatch[1]);
            startMin = parseInt(openMatch[2]);
            const startPeriod = openMatch[3].toUpperCase();
            if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
            if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        }

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        const windowStartMins = startHour * 60 + startMin;
        const windowEndMins = endHour * 60 + endMin;

        if (windowStartMins <= windowEndMins) {
            // e.g. 10:00 AM to 9:00 PM
            return currentMins >= windowStartMins && currentMins <= windowEndMins;
        } else {
            // e.g. 10:00 PM to 2:00 AM (crosses midnight)
            return currentMins >= windowStartMins || currentMins <= windowEndMins;
        }
    };

    if (loading) return <div className="p-8 text-center">Loading plans...</div>;

    return (
        <div className="p-4 md:p-0 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Subscriptions</h1>
                <p className="text-gray-500 mt-2 font-medium">Manage your meal plans and daily bookings.</p>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-gray-100/80 backdrop-blur-md rounded-2xl mb-8 border border-gray-200 shadow-sm max-w-md mx-auto">
                <button
                    onClick={() => setActiveTab('browse')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                        activeTab === 'browse' 
                        ? 'bg-white text-[#FF6B00] shadow-md transform scale-[1.02]' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Browse Plans</span>
                </button>
                <button
                    onClick={() => setActiveTab('my-plans')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 ${
                        activeTab === 'my-plans' 
                        ? 'bg-white text-[#FF6B00] shadow-md transform scale-[1.02]' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>My Subscriptions</span>
                </button>
            </div>

            {activeTab === 'browse' && (
                <div className="animate-in fade-in pb-24">
                    <div className="text-center mb-6 mt-4">
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Choose the plan that's right for you</h2>
                        <p className="text-gray-500 mt-2 font-medium">Downgrade or upgrade at any time.</p>
                    </div>

                    {/* Simple How it works card */}
                    <div className="max-w-3xl mx-auto mb-10 bg-[#FFF5EA] p-6 rounded-2xl border border-orange-100 shadow-sm">
                        <h4 className="font-bold text-[#8B3A15] text-xl mb-4">How it works</h4>
                        <ul className="list-disc pl-5 text-[15px] md:text-base text-[#A85128] space-y-2.5 marker:text-[#8B3A15]">
                            <li>
                                Book your 🍛 meal anytime before 🌙 <span className="font-bold text-[#8B3A15]">11:00 PM</span> to receive it on 🌅 next day morning.
                            </li>
                            <li>
                                Enjoy a 🍽️ fresh, hot breakfast delivered right to your door with <span className="font-bold text-[#8B3A15]">Zero Delivery 🛵 Fees</span>.
                            </li>
                            <li>
                                Pause or skip a day by just not booking; your meals won't expire until used!
                            </li>
                        </ul>
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 mt-8 max-w-5xl mx-auto px-4 md:px-0">Individual Plans</h3>
                    <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-8 pt-4 px-4 -mx-4 md:mx-auto md:px-0 md:overflow-visible">
                        {plans.map(plan => {
                            const isSelected = highlightedPlan?.id === plan.id;
                            return (
                                <div 
                                    key={plan.id} 
                                    onClick={() => setHighlightedPlan(plan)}
                                    className={`shrink-0 w-[75vw] sm:w-[50vw] md:w-auto snap-center relative bg-white rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group 
                                        ${isSelected 
                                            ? 'ring-4 ring-gray-900 shadow-2xl scale-[1.02] md:scale-105 z-10' 
                                            : 'border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
                                        }`}
                                >
                                    {/* Selection Checkmark */}
                                    {isSelected && (
                                        <div className="absolute bottom-6 right-6 z-20 bg-gray-900 text-white rounded-full shadow-lg border-2 border-white flex items-center justify-center p-0.5">
                                            <CheckCircle2 className="w-5 h-5 fill-gray-900 text-white" />
                                        </div>
                                    )}

                                    {/* Gradient Header Component */}
                                    <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8A00] p-5 relative overflow-hidden">
                                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div>
                                                <h3 className="font-black text-xl md:text-2xl text-white drop-shadow-sm mb-1 flex items-center">
                                                    <User className="w-5 h-5 mr-2 opacity-90" /> {plan.name}
                                                </h3>
                                                <span className="inline-block bg-yellow-400 text-yellow-900 text-[11px] uppercase tracking-wider font-black px-3 py-1 rounded-full shadow-md mt-1 border border-yellow-300">
                                                    {plan.mealCount} Days
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <span className="block text-3xl font-black text-white drop-shadow-md">₹{plan.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6">

                                        <div className="space-y-4">
                                            <div className="flex items-start">
                                                <CheckCircle2 className="w-5 h-5 text-[#FF6B00] mr-3 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Meal Type</p>
                                                    <p className="text-sm text-gray-500 capitalize">{plan.mealType}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <CheckCircle2 className="w-5 h-5 text-[#FF6B00] mr-3 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Total Days Included</p>
                                                    <p className="text-sm text-gray-500">{plan.mealCount} Days</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <CheckCircle2 className="w-5 h-5 text-[#FF6B00] mr-3 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Delivery</p>
                                                    <p className="text-sm text-gray-500">Free daily delivery</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <CheckCircle2 className="w-5 h-5 text-[#FF6B00] mr-3 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Flexibility</p>
                                                    <p className="text-sm text-gray-500">Skip days anytime</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Group Plan Card Below Normal Plans */}
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 mt-8 max-w-5xl mx-auto px-4 md:px-0 text-center sm:text-left sm:max-w-[300px]">Group Plans</h3>
                    <div className="w-full max-w-[280px] sm:max-w-[300px] mx-auto mb-12">
                        <div 
                            onClick={() => setIsGroupPopupOpen(true)}
                            className="w-full relative bg-white rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group border border-gray-200 shadow-sm hover:border-gray-900 hover:shadow-xl hover:-translate-y-1"
                        >
                            <div className="bg-gradient-to-br from-gray-900 to-black p-6 relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white opacity-10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h3 className="font-black text-2xl text-white drop-shadow-sm mb-2 flex items-center">
                                            <Users className="w-6 h-6 mr-2 opacity-90" /> Group Plan
                                        </h3>
                                        <span className="inline-block bg-[#FF6B00] text-white text-[11px] uppercase tracking-wider font-black px-3 py-1.5 rounded-full shadow-md border border-orange-500">
                                            10% Discount
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-gray-900 mr-3 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Buy together</p>
                                            <p className="text-sm text-gray-500">For family & friends</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-gray-900 mr-3 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Savings</p>
                                            <p className="text-sm text-gray-500">Flat 10% off total</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <CheckCircle2 className="w-5 h-5 text-gray-900 mr-3 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Flexibility</p>
                                            <p className="text-sm text-gray-500">Select any plan</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                    <span className="text-gray-900 font-bold text-sm group-hover:text-[#FF6B00] transition-colors">
                                        Select Plan &rarr;
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fixed Bottom Action Bar */}
                    <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex justify-center">
                        <div className="max-w-7xl w-full flex justify-center">
                            <button
                                disabled={!highlightedPlan}
                                onClick={() => {
                                    if(highlightedPlan) {
                                        navigate('/plan-checkout', { state: { plan: highlightedPlan, subscriptionMenu, groupSize: 1 } });
                                    }
                                }}
                                className={`w-full md:w-96 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                                    highlightedPlan 
                                    ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 hover:bg-[#FF8A00] hover:-translate-y-0.5' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'my-plans' && (
                <div className="space-y-4">
                    {mySubscriptions.map(sub => (
                        <div key={sub.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative group hover:shadow-md transition-all duration-300 max-w-3xl mx-auto">
                            <div className={`h-2 ${sub.status === 'active' ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8A00]' : 'bg-gray-300'}`}></div>
                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${sub.status === 'completed' || sub.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                {sub.status}
                                            </span>
                                            {sub.groupSize > 1 && (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 flex items-center">
                                                    <Users className="w-3 h-3 mr-1" /> Group Plan ({sub.groupSize} Persons)
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-2xl md:text-3xl text-gray-900 tracking-tight">{sub.planName}</h3>
                                        <p className="text-sm text-gray-500 font-medium mt-1">Manage your upcoming deliveries</p>
                                    </div>
                                    
                                    <div className="text-right flex flex-col items-end shrink-0 ml-4">
                                        <div className="bg-orange-50 border border-orange-100 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                                            <span className="block text-2xl md:text-3xl font-black text-orange-600 leading-none">{sub.remainingMeals}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-2">Days Left</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <button 
                                        onClick={() => navigate('/book-meal', { state: { subscription: sub, plans, mainMenu } })}
                                        disabled={sub.remainingMeals <= 0 || !isBookingAllowed(sub.planId)}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center ${
                                            sub.remainingMeals <= 0 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : !isBookingAllowed(sub.planId)
                                                    ? 'bg-orange-50 text-orange-400 cursor-not-allowed border border-orange-100'
                                                    : 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30 hover:bg-[#FF8A00] hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {sub.remainingMeals <= 0 
                                            ? 'No Days Left' 
                                            : !isBookingAllowed(sub.planId) 
                                                ? `Booking Closed - Opens at ${plans.find(p => p.id === sub.planId)?.bookingOpenTime || '10:00 AM'}` 
                                                : 'Book Next Meal'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {mySubscriptions.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">You don't have any active subscriptions.</p>
                            <button onClick={() => setActiveTab('browse')} className="mt-4 text-orange-600 font-semibold hover:underline">Browse Plans</button>
                        </div>
                    )}
                </div>
            )}

            {/* Plan Details Modal REMOVED - Logic moved to PlanCheckout.jsx */}
            
            {/* Group Plan Popup */}
            {isGroupPopupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsGroupPopupOpen(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 z-10 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="bg-gray-50 border-b border-gray-100 p-6 pt-8 text-center">
                            <h3 className="font-black text-2xl text-gray-900 tracking-tight">Group Plan</h3>
                            <p className="text-gray-500 text-sm mt-1 font-medium">Get a 10% discount on your order</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Number of Persons</label>
                                <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-1.5 w-max border border-gray-200 mx-auto">
                                    <button 
                                        onClick={() => setGroupPlanSize(Math.max(2, groupPlanSize - 1))}
                                        className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-700 hover:text-black transition-colors"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="font-black text-gray-900 min-w-[40px] text-center text-xl">{groupPlanSize}</span>
                                    <button 
                                        onClick={() => setGroupPlanSize(groupPlanSize + 1)}
                                        className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-700 hover:text-black transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3 text-center w-full block">Select Plan</label>
                                <select 
                                    value={selectedGroupPlanId}
                                    onChange={(e) => setSelectedGroupPlanId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] shadow-sm transition-all"
                                >
                                    <option value="" disabled>Choose a plan...</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (₹{p.price}/person)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-2">
                                <button
                                    disabled={!selectedGroupPlanId}
                                    onClick={() => {
                                        const plan = plans.find(p => p.id === selectedGroupPlanId);
                                        if(plan) {
                                            setIsGroupPopupOpen(false);
                                            navigate('/plan-checkout', { state: { plan, subscriptionMenu, groupSize: groupPlanSize } });
                                        }
                                    }}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-sm ${
                                        selectedGroupPlanId 
                                        ? 'bg-black text-white hover:bg-gray-800 hover:-translate-y-0.5 shadow-md' 
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Proceed to Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <LoginPopup 
                isOpen={showLoginPopup} 
                onClose={() => setShowLoginPopup(false)} 
                message="Please login or create an account to subscribe to a meal plan." 
            />
        </div>
    );
};

export default Plans;
