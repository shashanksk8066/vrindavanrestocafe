import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { MapPin, Clock, Navigation, Plus, ArrowLeft, CheckCircle2, X, Gift } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { loadRazorpayScript } from '../../utils/razorpay';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { calculateDistance } from '../../utils/distance';

const Checkout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    // Router State
    const { subscription, selectedMenuItems, selectedMenuItemsData, selectedAddOns, date, planDetails, isInstantOrder } = location.state || {};

    const [localCartItems, setLocalCartItems] = useState(location.state?.cartItems || []);
    const [localAddOnItems, setLocalAddOnItems] = useState(location.state?.addOnItems || []);

    const parcelTotal = isInstantOrder 
        ? localCartItems.reduce((acc, item) => acc + ((item.parcelCharges || 0) * item.quantity), 0)
        : localAddOnItems.reduce((acc, item) => acc + ((item.parcelCharges || 0) * item.quantity), 0);

    const itemTotal = isInstantOrder 
        ? localCartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) 
        : localAddOnItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const currentTotalAmount = itemTotal + parcelTotal;

    const handleQuantityChange = (id, delta, isCart) => {
        if (isCart) {
            setLocalCartItems(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, quantity: Math.max(0, item.quantity + delta) };
                }
                return item;
            }).filter(item => item.quantity > 0));
        } else {
            setLocalAddOnItems(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, quantity: Math.max(0, item.quantity + delta) };
                }
                return item;
            }).filter(item => item.quantity > 0));
        }
    };

    const displayDate = date ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : '';

    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [deliverySlots, setDeliverySlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [loading, setLoading] = useState(true);
    
    // New Address Form State
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    
    const RESTAURANT_LAT = parseFloat(import.meta.env.VITE_RESTAURANT_LAT) || 12.9716;
    const RESTAURANT_LNG = parseFloat(import.meta.env.VITE_RESTAURANT_LNG) || 77.5946;
    const MAX_RADIUS = parseFloat(import.meta.env.VITE_MAX_DELIVERY_RADIUS_KM) || 2;
    
    const [newAddress, setNewAddress] = useState({ label: 'Home', flatNumber: '', streetArea: '', landmark: '', lat: RESTAURANT_LAT, lng: RESTAURANT_LNG });
    
    const distanceFromRestaurant = calculateDistance(RESTAURANT_LAT, RESTAURANT_LNG, newAddress.lat, newAddress.lng);
    const isServiceable = distanceFromRestaurant <= MAX_RADIUS;
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const [processing, setProcessing] = useState(false);

    // Coupon State
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);
    const [gateways, setGateways] = useState({ phonepe: false, razorpay: false });
    const [selectedGateway, setSelectedGateway] = useState('phonepe');

    // Free Foods State
    const [allFreeFoods, setAllFreeFoods] = useState([]);
    const [selectedFreeFood, setSelectedFreeFood] = useState(null);

    const finalPayable = Math.max(0, currentTotalAmount - (appliedCoupon ? appliedCoupon.discountValue : 0));
    const eligibleFreeFoods = allFreeFoods.filter(item => finalPayable >= item.minOrderAmount);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Addresses
            const q = query(collection(db, 'addresses'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const addressList = [];
            snapshot.forEach(doc => addressList.push({ id: doc.id, ...doc.data() }));
            setAddresses(addressList);
            if (addressList.length > 0) setSelectedAddressId(addressList[0].id);

            // Fetch Delivery Slots from Plan
            if (!isInstantOrder) {
                if (planDetails && planDetails.deliverySlots && planDetails.deliverySlots.length > 0) {
                    setDeliverySlots(planDetails.deliverySlots);
                    setSelectedSlot(planDetails.deliverySlots[0]);
                } else if (subscription?.planId) {
                    const planDoc = await getDoc(doc(db, 'subscriptionPlans', subscription.planId));
                    if (planDoc.exists()) {
                        const slots = planDoc.data().deliverySlots || [];
                        setDeliverySlots(slots);
                        if (slots.length > 0) setSelectedSlot(slots[0]);
                    }
                }
            }

            // Fetch active free foods
            const ffQ = query(collection(db, 'freeFoods'), where('status', '==', 'active'));
            const ffSnap = await getDocs(ffQ);
            const ffData = [];
            ffSnap.forEach(d => ffData.push({ id: d.id, ...d.data() }));
            setAllFreeFoods(ffData);

        } catch (error) {
            console.error("Error fetching checkout data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/gateways`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.gateways) {
                    setGateways(data.gateways);
                    if (data.gateways.razorpay && !data.gateways.phonepe) {
                        setSelectedGateway('razorpay');
                    } else if (data.gateways.phonepe && !data.gateways.razorpay) {
                        setSelectedGateway('phonepe');
                    }
                }
            })
            .catch(console.error);
            
        if (!subscription && !isInstantOrder) {
            navigate('/plans');
            return;
        }
        fetchData();
    }, [subscription, isInstantOrder, navigate, user.uid, planDetails]);

    // Clear selected free food if total drops below requirement
    useEffect(() => {
        if (selectedFreeFood) {
            if (finalPayable < selectedFreeFood.minOrderAmount) {
                setSelectedFreeFood(null);
            }
        }
    }, [finalPayable, selectedFreeFood]);


    const handleGetLocation = () => {
        setFetchingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setNewAddress(prev => ({
                        ...prev,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }));
                    setFetchingLocation(false);
                },
                (error) => {
                    console.error("Geolocation error", error);
                    alert("Could not get location. Please ensure location permissions are granted.");
                    setFetchingLocation(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
            setFetchingLocation(false);
        }
    };

    const handleSaveAddress = async (e) => {
        e.preventDefault();
        if (!isServiceable) return alert(`Selected location is outside our ${MAX_RADIUS}km delivery zone.`);
        try {
            const fullAddress = `${newAddress.flatNumber}, ${newAddress.streetArea}${newAddress.landmark ? ', ' + newAddress.landmark : ''}`;
            const addressData = {
                ...newAddress,
                fullAddress,
                userId: user.uid,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'addresses'), addressData);
            setAddresses([...addresses, { id: docRef.id, ...addressData }]);
            setSelectedAddressId(docRef.id);
            setIsAddressModalOpen(false);
            setNewAddress({ label: 'Home', flatNumber: '', streetArea: '', landmark: '', lat: RESTAURANT_LAT, lng: RESTAURANT_LNG });
        } catch (error) {
            console.error("Error saving address", error);
            alert("Failed to save address: " + (error.message || error));
        }
    };


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
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/reserve-coupon`, {
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
                setCouponError(`Minimum order amount should be ₹${couponData.minOrderAmount}`);
                setAppliedCoupon(null);
            } else {
                let discountValue = 0;
                if (couponData.type === 'flat') {
                    discountValue = couponData.discount;
                } else if (couponData.type === 'percentage') {
                    discountValue = Math.round((currentTotalAmount * couponData.discount) / 100);
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
                await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/release-coupon`, {
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

    const handleCheckout = async () => {
        if (!selectedAddressId) return alert("Please select a delivery address");
        if (!isInstantOrder && deliverySlots.length > 0 && !selectedSlot) return alert("Please select a delivery slot");

        setProcessing(true);
        try {
            const token = await user.getIdToken();
            let payload, endpoint;

            if (isInstantOrder) {
                payload = {
                    items: localCartItems,
                    addressId: selectedAddressId,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    sessionId: getSessionId(),
                    freeFood: selectedFreeFood,
                    gateway: selectedGateway
                };
                endpoint = '/api/orders/create-instant-payment';
            } else {
                payload = {
                    subscriptionId: subscription.id,
                    menuItems: selectedMenuItems,
                    addOnItems: localAddOnItems,
                    date,
                    deliverySlot: selectedSlot,
                    addressId: selectedAddressId,
                    freeFood: selectedFreeFood,
                    gateway: selectedGateway
                };
                endpoint = currentTotalAmount > 0 ? '/api/orders/create-addon-payment' : '/api/orders/book-meal';
            }
            
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}${ endpoint }`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                if (data.gateway === 'razorpay') {
                    const loaded = await loadRazorpayScript();
                    if (!loaded) {
                        alert("Razorpay SDK failed to load. Are you offline?");
                        setProcessing(false);
                        return;
                    }
                    const options = {
                        key: data.key,
                        amount: data.amount,
                        currency: "INR",
                        name: "Vrindavan Resto Cafe",
                        order_id: data.orderId,
                        handler: async function (response) {
                            try {
                                const verifyRes = await fetch(`${import.meta.env.VITE_API_URL || ""}${isInstantOrder ? '/api/orders/verify-instant-payment' : (currentTotalAmount > 0 ? '/api/orders/verify-addon-payment' : '/api/orders/verify-payment')}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({
                                        transactionId: data.transactionId,
                                        gateway: 'razorpay',
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_signature: response.razorpay_signature
                                    })
                                });
                                const verifyData = await verifyRes.json();
                                if (verifyData.success) {
                                    localStorage.removeItem('guestCart');
                                    navigate(isInstantOrder ? '/orders' : '/plans?tab=my-plans');
                                } else {
                                    alert("Payment verification failed: " + (verifyData.message || 'Unknown error'));
                                    setProcessing(false);
                                }
                            } catch (e) {
                                alert("Error verifying payment");
                                setProcessing(false);
                            }
                        },
                        prefill: {
                            name: user.displayName || 'Customer',
                            email: user.email,
                            contact: user.phoneNumber || ''
                        },
                        theme: { color: "#FF6B00" },
                        modal: {
                            ondismiss: function() {
                                setProcessing(false);
                            }
                        }
                    };
                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', function (response) {
                        alert(response.error.description);
                        setProcessing(false);
                    });
                    rzp.open();
                } else if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                } else {
                    localStorage.removeItem('guestCart');
                    navigate(isInstantOrder ? '/orders' : '/plans?tab=my-plans');
                }
            } else {
                alert(data.message || data.debug || "Checkout failed: " + JSON.stringify(data));
                setProcessing(false);
            }
        } catch (error) {
            console.error("Checkout error", error);
            alert("Error processing checkout");
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading checkout...</div>;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-black mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>

            <h1 className="text-2xl font-bold mb-6">Checkout</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-orange-500" /> Delivery Address
                    </h2>
                    <button onClick={() => setIsAddressModalOpen(true)} className="text-sm font-medium text-orange-600 hover:text-orange-800 flex items-center">
                        <Plus className="w-4 h-4 mr-1" /> Add New
                    </button>
                </div>
                <div className="p-5">
                    {addresses.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p>No saved addresses.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map(addr => (
                                <div 
                                    key={addr.id} 
                                    onClick={() => setSelectedAddressId(addr.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="inline-block px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 mb-2">{addr.label}</span>
                                            <p className="text-gray-800 text-sm">{addr.fullAddress}</p>
                                            {addr.lat && <p className="text-xs text-gray-400 mt-1">GPS verified</p>}
                                        </div>
                                        {selectedAddressId === addr.id && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {!isInstantOrder && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-orange-500" /> Delivery Time
                        </h2>
                    </div>
                    <div className="p-5">
                        {deliverySlots.length === 0 ? (
                            <p className="text-gray-500 text-sm">No specific delivery slots available. Standard delivery time applies.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {deliverySlots.map((slot, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer text-center font-medium transition-colors ${selectedSlot === slot ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                                    >
                                        {slot}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {allFreeFoods.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center">Free Items</h2>
                    </div>
                    <div className="p-5">
                        <div className="flex overflow-x-auto pb-2 space-x-3 hide-scrollbar">
                            {allFreeFoods.map(item => {
                                const isUnlocked = finalPayable >= item.minOrderAmount;
                                const amountNeeded = item.minOrderAmount - finalPayable;
                                
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => isUnlocked ? setSelectedFreeFood(selectedFreeFood?.id === item.id ? null : item) : null}
                                        className={`flex-shrink-0 w-32 rounded-xl border-2 p-2 transition-all relative ${
                                            isUnlocked 
                                                ? (selectedFreeFood?.id === item.id ? 'border-orange-500 bg-orange-50 cursor-pointer' : 'border-gray-100 bg-white hover:border-orange-300 cursor-pointer')
                                                : 'border-gray-100 bg-gray-50 opacity-70 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="w-full h-20 bg-gray-200 rounded-lg mb-2 overflow-hidden relative flex items-center justify-center">
                                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover ${!isUnlocked ? 'grayscale' : ''}`} /> : <Gift className="w-8 h-8 text-gray-400" />}
                                            {selectedFreeFood?.id === item.id && isUnlocked && (
                                                <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-0.5">
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
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900">Order Summary</h2>
                    {!isInstantOrder && displayDate && <span className="text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">For {displayDate}</span>}
                </div>
                <div className="p-5">
                    {isInstantOrder ? (
                        <div className="space-y-4">
                            {localCartItems?.map((item, i) => (
                                <div key={i} className="flex justify-between items-center pb-4 border-b border-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xs">
                                                        Img
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                            <div className="flex items-center mt-1 space-x-2">
                                                <button onClick={() => handleQuantityChange(item.id, -1, true)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">-</button>
                                                <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => handleQuantityChange(item.id, 1, true)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="pb-4 border-b border-gray-50">
                                <p className="font-bold text-gray-800 text-sm mb-3">Meal{selectedMenuItemsData && selectedMenuItemsData.length > 1 ? 's' : ''}</p>
                                <div className="space-y-3">
                                    {selectedMenuItemsData && selectedMenuItemsData.length > 0 ? selectedMenuItemsData.map((item, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                {item.imageUrl || item.image ? (
                                                    <img src={item.imageUrl || item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xs">
                                                        Img
                                                    </div>
                                                )}
                                            </div>
                                            <p className="font-medium text-gray-800 text-sm">
                                                {item.name}
                                            </p>
                                        </div>
                                    )) : (
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-gray-500 text-xs">
                                                Img
                                            </div>
                                            <p className="font-medium text-gray-800 text-sm">Main Course</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {localAddOnItems.length > 0 && (
                                <div className="pt-2">
                                    <p className="font-bold text-gray-800 text-sm mb-3">Add-ons</p>
                                    <div className="space-y-3">
                                        {localAddOnItems.map((addon, i) => (
                                            <div key={i} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                                <div className="flex items-center space-x-3">
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                                            {addon.image ? (
                                                                <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xs">
                                                                    Img
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800 text-sm">{addon.name}</p>
                                                        <div className="flex items-center mt-1 space-x-2">
                                                            <button onClick={() => handleQuantityChange(addon.id, -1, false)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">-</button>
                                                            <span className="text-xs font-bold text-gray-800 w-4 text-center">{addon.quantity}</span>
                                                            <button onClick={() => handleQuantityChange(addon.id, 1, false)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">+</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">₹{addon.price * addon.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500 font-medium text-sm">Item Total</span>
                            <span className="font-bold text-gray-900 text-sm">₹{itemTotal.toFixed(2)}</span>
                        </div>
                        {parcelTotal > 0 && (
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-500 font-medium text-sm">Parcel Charges</span>
                                <span className="font-bold text-gray-900 text-sm">₹{parcelTotal.toFixed(2)}</span>
                            </div>
                        )}
                        {isInstantOrder && (
                            <>
                                {/* Coupon Section */}
                                <div className="pb-3 border-b border-gray-50 mb-3">
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
                            </>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-gray-600 font-medium">To Pay</span>
                            <span className="text-2xl font-black text-orange-600">
                                ₹{finalPayable.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {gateways.phonepe && gateways.razorpay && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center">
                            Payment Gateway
                        </h2>
                    </div>
                    <div className="p-5">
                        <label className="flex items-center space-x-3 mb-4 cursor-pointer">
                            <input 
                                type="radio" 
                                name="gateway" 
                                value="phonepe" 
                                checked={selectedGateway === 'phonepe'} 
                                onChange={() => setSelectedGateway('phonepe')}
                                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-900">PhonePe</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                                type="radio" 
                                name="gateway" 
                                value="razorpay" 
                                checked={selectedGateway === 'razorpay'} 
                                onChange={() => setSelectedGateway('razorpay')}
                                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="font-medium text-gray-900">Razorpay</span>
                        </label>
                    </div>
                </div>
            )}

            <button 
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors mt-6 disabled:opacity-50"
            >
                {processing ? 'Processing...' : (isInstantOrder || currentTotalAmount > 0) ? 'Proceed to Pay' : 'Confirm & Book Meal'}
            </button>

            {/* Address Modal */}
            {isAddressModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="font-bold text-lg">Select Delivery Location</h3>
                            <button type="button" onClick={() => setIsAddressModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="relative h-64 shrink-0 bg-gray-100 z-0">
                            {/* Serviceability Overlay Badge */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap">
                                {isServiceable ? (
                                    <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Service Available
                                    </div>
                                ) : (
                                    <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center">
                                        <X className="w-4 h-4 mr-2" /> Outside {MAX_RADIUS}km Zone
                                    </div>
                                )}
                            </div>
                            {isLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ height: '100%', width: '100%' }}
                                        center={{ lat: newAddress.lat, lng: newAddress.lng }}
                                        zoom={14}
                                        options={{ disableDefaultUI: true, zoomControl: true }}
                                    >
                                        <Marker 
                                            draggable={true}
                                            position={{ lat: newAddress.lat, lng: newAddress.lng }}
                                            onDragEnd={(e) => {
                                                setNewAddress(prev => ({
                                                    ...prev,
                                                    lat: e.latLng.lat(),
                                                    lng: e.latLng.lng()
                                                }));
                                            }}
                                        />
                                        <Circle 
                                            center={{ lat: RESTAURANT_LAT, lng: RESTAURANT_LNG }}
                                            radius={MAX_RADIUS * 1000}
                                            options={{
                                                fillColor: "#22c55e",
                                                fillOpacity: 0.1,
                                                strokeColor: "#22c55e",
                                                strokeOpacity: 0.8,
                                                strokeWeight: 2,
                                                clickable: false,
                                                interactive: false
                                            }}
                                        />
                                    </GoogleMap>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">Loading Map...</div>
                            )}
                            <button 
                                type="button"
                                onClick={handleGetLocation}
                                disabled={fetchingLocation}
                                className="absolute bottom-4 right-4 z-[400] bg-white text-black p-3 rounded-full shadow-lg hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
                                title="Locate Me"
                            >
                                {fetchingLocation ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Navigation className="w-5 h-5 text-blue-600" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 relative z-10">
                            <form id="address-form" onSubmit={handleSaveAddress} className="space-y-4">
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex items-start mb-4">
                                    <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                                    <p>Move the map pin to set your exact delivery location.</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">House / Flat / Block No.</label>
                                    <input type="text" required value={newAddress.flatNumber} onChange={e => setNewAddress({...newAddress, flatNumber: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" placeholder="e.g. Flat 402, Block B" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Apartment / Road / Area</label>
                                    <input type="text" required value={newAddress.streetArea} onChange={e => setNewAddress({...newAddress, streetArea: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" placeholder="e.g. Prestige Shantiniketan, Whitefield" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark (Optional)</label>
                                    <input type="text" value={newAddress.landmark} onChange={e => setNewAddress({...newAddress, landmark: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" placeholder="e.g. Near Apollo Pharmacy" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Save address as</label>
                                    <div className="flex space-x-3">
                                        {['Home', 'Office', 'Other'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNewAddress({...newAddress, label: type})}
                                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${newAddress.label === type ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-white shrink-0 relative z-10">
                            <button type="submit" form="address-form" disabled={!isServiceable} className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                                Save Address
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Checkout;
