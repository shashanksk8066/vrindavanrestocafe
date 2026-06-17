import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Search, Utensils, CheckCircle2, Clock, ChefHat, Check, ArrowLeft, Gift } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const DineInTrack = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const phoneParam = searchParams.get('phone');
    const navigate = useNavigate();
    
    const [phoneInput, setPhoneInput] = useState(phoneParam || '');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(!!phoneParam);
    const [searched, setSearched] = useState(!!phoneParam);
    const [error, setError] = useState('');

    const fetchOrders = async (phoneToSearch) => {
        if (!phoneToSearch || phoneToSearch.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }
        
        setError('');
        setLoading(true);
        setSearched(true);
        
        try {
            const q = query(
                collection(db, 'dineInOrders'), 
                where('customerPhone', '==', phoneToSearch)
            );
            
            const snap = await getDocs(q);
            const fetchedOrders = [];
            snap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));
            
            // Sort client side since we need composite index otherwise
            fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            setOrders(fetchedOrders);
        } catch (err) {
            console.error("Error fetching dine-in orders", err);
            setError('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (phoneParam) {
            fetchOrders(phoneParam);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phoneParam]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams({ phone: phoneInput });
    };

    const handleBack = () => {
        if (orders && orders.length > 0 && orders[0].tableNumber) {
            navigate(`/dine-in/${orders[0].tableNumber}`, { replace: true });
        } else {
            navigate('/');
        }
    };

    const getStatusStep = (status) => {
        switch (status) {
            case 'received': return 1;
            case 'preparing': return 2;
            case 'served': return 3;
            default: return 1;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-white border-b border-gray-100 shadow-sm pt-8 pb-8 px-4 relative">
                <button 
                    onClick={handleBack}
                    className="absolute top-6 left-4 md:left-8 p-2.5 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 transition-colors border border-gray-100 shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="max-w-xl mx-auto text-center mt-2">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Utensils className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Track Your Order</h1>
                    <p className="text-gray-500 font-medium mt-2">Enter your phone number to check your table's order status.</p>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 py-8">
                <form onSubmit={handleSearch} className="mb-8 relative">
                    <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Enter phone number..."
                        className="w-full bg-white border-2 border-gray-200 focus:border-amber-500 rounded-2xl px-6 py-4 text-lg font-bold text-gray-900 placeholder-gray-400 outline-none transition-all shadow-sm pr-16"
                    />
                    <button 
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 flex items-center justify-center transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </form>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : searched && orders.length === 0 && !error ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
                        <p className="text-gray-500 font-medium mt-2">We couldn't find any active orders for this number.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => {
                            const step = getStatusStep(order.status);
                            
                            return (
                                <div key={order.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Order #{generateNumericId(order.id)}</div>
                                            <div className="font-black text-gray-900 flex items-center">
                                                Table {order.tableNumber}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-amber-600">₹{order.totalAmount}</div>
                                            <div className="text-xs font-bold text-gray-500">
                                                {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        {/* Status Tracker */}
                                        <div className="relative mb-8">
                                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
                                            
                                            <div className="absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 rounded-full z-0 transition-all duration-500" 
                                                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}>
                                            </div>
                                            
                                            <div className="relative z-10 flex justify-between">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-300 ${step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider mt-2 ${step >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>Received</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-300 ${step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        <ChefHat className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider mt-2 ${step >= 2 ? 'text-amber-600' : 'text-gray-400'}`}>Preparing</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-300 ${step >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-wider mt-2 ${step >= 3 ? 'text-amber-600' : 'text-gray-400'}`}>Served</span>
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
                                        <div className="space-y-3">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                    <div className="font-semibold text-gray-800 flex items-center">
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${
                                                            item.foodType === 'non-veg' ? 'bg-red-500' : 
                                                            item.foodType === 'egg' ? 'bg-yellow-500' : 
                                                            'bg-green-500'
                                                        }`}></span>
                                                        {item.name}
                                                    </div>
                                                    <div className="font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">x{item.quantity}</div>
                                                </div>
                                            ))}
                                            {order.freeFood && (
                                                <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-dashed border-gray-200">
                                                    <div className="font-bold text-orange-600 flex items-center bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                                        <Gift className="w-3.5 h-3.5 mr-1.5" />
                                                        {order.freeFood.name} (FREE)
                                                    </div>
                                                    <div className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-xs">x1</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DineInTrack;
