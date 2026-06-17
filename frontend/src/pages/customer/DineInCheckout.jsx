import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Utensils, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Gift } from 'lucide-react';

const DineInCheckout = () => {
    const { tableNumber } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [localCartItems, setLocalCartItems] = useState(location.state?.cartItems || []);
    
    const currentTotalAmount = localCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleQuantityChange = (id, delta) => {
        setLocalCartItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [requiresTableService, setRequiresTableService] = useState(false);

    const [processing, setProcessing] = useState(false);

    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    // Free Foods State
    const [allFreeFoods, setAllFreeFoods] = useState([]);
    const [selectedFreeFood, setSelectedFreeFood] = useState(null);

    React.useEffect(() => {
        const fetchFreeFoods = async () => {
            try {
                const ffQ = query(collection(db, 'freeFoods'), where('status', '==', 'active'));
                const ffSnap = await getDocs(ffQ);
                const ffData = [];
                ffSnap.forEach(d => ffData.push({ id: d.id, ...d.data() }));
                setAllFreeFoods(ffData);
            } catch (error) {
                console.error("Error fetching free foods", error);
            }
        };
        fetchFreeFoods();
    }, []);

    const finalAmount = Math.max(0, currentTotalAmount + (requiresTableService ? 20 : 0) - (appliedCoupon?.calculatedDiscount || 0));
    
    // The amount eligible for unlocking free items is the final amount without service charge. Or with service charge? 
    // The finalAmount without service charge is currentTotalAmount - discount
    const eligibleAmount = Math.max(0, currentTotalAmount - (appliedCoupon?.calculatedDiscount || 0));
    const eligibleFreeFoods = allFreeFoods.filter(item => eligibleAmount >= item.minOrderAmount);

    React.useEffect(() => {
        if (selectedFreeFood && eligibleAmount < selectedFreeFood.minOrderAmount) {
            setSelectedFreeFood(null);
        }
    }, [eligibleAmount, selectedFreeFood]);

    if (localCartItems.length === 0) {
        navigate(`/dine-in/${tableNumber}`);
        return null;
    }


    const getSessionId = () => {
        let sid = localStorage.getItem('checkout_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('checkout_session_id', sid);
        }
        return sid;
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
            if (currentTotalAmount < couponData.minOrderAmount) {
                setCouponError(`Minimum order amount of ₹${couponData.minOrderAmount} required`);
                setAppliedCoupon(null);
            } else {
                let discount = 0;
                if (couponData.type === 'flat') {
                    discount = couponData.discount;
                } else if (couponData.type === 'percentage') {
                    discount = Math.round((currentTotalAmount * couponData.discount) / 100);
                }
                setAppliedCoupon({ ...couponData, calculatedDiscount: discount });
            }
        } catch (error) {
            console.error("Error applying coupon:", error);
            setCouponError('Failed to apply coupon');
        } finally {
            setApplyingCoupon(false);
        }
    };

    const handlePayment = async () => {
        if (!customerName.trim() || !customerPhone.trim()) {
            alert("Please enter your name and phone number");
            return;
        }
        if (customerPhone.length < 10) {
            alert("Please enter a valid phone number");
            return;
        }

        setProcessing(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';
            
            const payload = {
                items: localCartItems,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                tableNumber,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                sessionId: getSessionId(),
                requiresTableService,
                freeFood: selectedFreeFood
            };

            const response = await fetch(`${API_URL}/api/orders/dine-in/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.success && data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                alert(data.message || 'Payment initiation failed');
                setProcessing(false);
            }
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Payment failed");
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm pt-6 pb-4 px-4">
                <div className="max-w-3xl mx-auto flex items-center relative">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 bg-white rounded-full transition-colors absolute left-0">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight text-center w-full">Checkout</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                
                {/* Your Details */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center">
                        <Utensils className="w-4 h-4 mr-2 text-amber-500" />
                        Table & Contact Details
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Table Number</label>
                            <input 
                                type="text"
                                value={`Table ${tableNumber}`}
                                disabled
                                className="w-full bg-gray-100 border border-transparent rounded-xl px-4 py-3 text-sm font-bold text-gray-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Your Name</label>
                            <input 
                                type="text"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                            <input 
                                type="tel"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                placeholder="For order tracking"
                                className="w-full bg-gray-50 border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Table Service Checkbox */}
                    <div className="mt-6">
                        <label className="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-colors">
                            <div className="relative flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        checked={requiresTableService}
                                        onChange={(e) => setRequiresTableService(e.target.checked)}
                                        className="w-5 h-5 border-2 border-gray-300 rounded text-amber-500 focus:ring-amber-500 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="ml-3 text-sm flex-1">
                                    <span className="font-bold text-gray-900 block">Table Service (₹20)</span>
                                    <span className="text-gray-500 text-xs font-medium mt-0.5 block">Opt for a waiter to serve your food directly at the table.</span>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {allFreeFoods.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6">
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Free Items</h2>
                        <div className="flex overflow-x-auto pb-2 space-x-3 hide-scrollbar">
                            {allFreeFoods.map(item => {
                                const isUnlocked = eligibleAmount >= item.minOrderAmount;
                                const amountNeeded = item.minOrderAmount - eligibleAmount;

                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => isUnlocked ? setSelectedFreeFood(selectedFreeFood?.id === item.id ? null : item) : null}
                                        className={`flex-shrink-0 w-32 rounded-xl border-2 p-2 transition-all relative ${
                                            isUnlocked 
                                                ? (selectedFreeFood?.id === item.id ? 'border-amber-500 bg-amber-50 cursor-pointer' : 'border-gray-100 bg-white hover:border-amber-300 cursor-pointer')
                                                : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="w-full h-20 bg-gray-200 rounded-lg mb-2 overflow-hidden relative flex items-center justify-center">
                                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover ${!isUnlocked ? 'grayscale' : ''}`} /> : <Gift className="w-8 h-8 text-gray-400" />}
                                            {selectedFreeFood?.id === item.id && isUnlocked && (
                                                <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-0.5">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            )}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                                    <span className="text-white text-[10px] font-black uppercase tracking-wider text-center px-1">
                                                        Add ₹{amountNeeded.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-center text-gray-800 line-clamp-2 leading-tight">{item.name}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Order Summary */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Order Summary</h2>
                    <div className="space-y-4">
                        {localCartItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <div className="flex items-start">
                                    <div className="font-semibold text-gray-900 text-sm">
                                        <div className="flex items-center">
                                            <div className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${
                                                item.foodType === 'non-veg' ? 'bg-red-500' : 
                                                item.foodType === 'egg' ? 'bg-yellow-500' : 
                                                'bg-green-500'
                                            }`}></div>
                                            {item.name}
                                        </div>
                                        <div className="text-gray-500 text-xs ml-4.5 mt-0.5">₹{item.price}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                                        <button onClick={() => handleQuantityChange(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded transition-colors font-bold">-</button>
                                        <span className="w-6 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                                        <button onClick={() => handleQuantityChange(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded transition-colors font-bold">+</button>
                                    </div>
                                    <div className="font-bold text-sm text-gray-900 w-12 text-right">
                                        ₹{item.price * item.quantity}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100 border-dashed">
                        {/* Coupon Section */}
                        <div className="mb-6">
                            {!appliedCoupon ? (
                                <div className="flex space-x-2">
                                    <input 
                                        type="text"
                                        placeholder="Have a coupon code?"
                                        value={couponCodeInput}
                                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 uppercase transition-all"
                                    />
                                    <button 
                                        onClick={handleApplyCoupon}
                                        disabled={applyingCoupon || !couponCodeInput.trim()}
                                        className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
                                    >
                                        {applyingCoupon ? '...' : 'Apply'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                                    <div className="flex items-center text-green-700 font-bold text-sm">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        '{appliedCoupon.code}' applied
                                    </div>
                                    <button 
                                        onClick={handleRemoveCoupon}
                                        className="p-1 hover:bg-green-100 rounded-lg transition-colors text-green-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {couponError && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{couponError}</p>}
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-500 font-medium">
                                <span>Subtotal</span>
                                <span>₹{currentTotalAmount}</span>
                            </div>
                            {requiresTableService && (
                                <div className="flex justify-between text-gray-500 font-medium">
                                    <span>Table Service</span>
                                    <span>₹20</span>
                                </div>
                            )}
                            {appliedCoupon && (
                                <div className="flex justify-between text-green-600 font-bold">
                                    <span>Discount ({appliedCoupon.code})</span>
                                    <span>-₹{appliedCoupon.calculatedDiscount}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-black text-gray-900 pt-3 border-t border-gray-100">
                                <span>Total to Pay</span>
                                <span>₹{finalAmount}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Pay Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
                <div className="max-w-3xl mx-auto">
                    <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center font-bold tracking-wide hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {processing ? (
                            <div className="flex items-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Processing...
                            </div>
                        ) : (
                            `Pay ₹${finalAmount}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DineInCheckout;
