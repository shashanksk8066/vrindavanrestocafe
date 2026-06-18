import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Search, ShoppingBag, Plus, Minus, Star, Utensils, Map, X, Clock, ChefHat, Check, Search as SearchIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const DineInMenu = () => {
    const { tableNumber } = useParams();
    const navigate = useNavigate();
    
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});
    
    // Tracking State
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [trackPhone, setTrackPhone] = useState('');
    const [trackedOrders, setTrackedOrders] = useState([]);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [trackingError, setTrackingError] = useState('');

    // Cart State
    const [cart, setCart] = useState({});

    // Refs for scrolling
    const categoryRefs = useRef({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [menuSnap, catSnap] = await Promise.all([
                    getDocs(collection(db, 'mainMenu')),
                    getDocs(collection(db, 'categories'))
                ]);
                
                const items = [];
                menuSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'active') {
                        // Fix for local network testing (mobile QR scans)
                        if (data.imageUrl) {
                            if (data.imageUrl.includes('ngrok-free.app')) {
                                } else if (data.imageUrl.includes('localhost')) {
                                }
                        }
                        items.push({ id: doc.id, ...data });
                    }
                });
                
                const cats = [];
                catSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'active') {
                        cats.push({ id: doc.id, ...data });
                    }
                });
                
                setMenuItems(items);
                setCategories(cats);
            } catch (error) {
                console.error("Error fetching menu:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const menuByCategory = useMemo(() => {
        return menuItems.reduce((acc, item) => {
            if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))) {
                return acc;
            }
            const cat = item.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    }, [menuItems, searchQuery]);

    const addToCart = (item) => {
        setCart(prev => {
            const current = prev[item.id];
            if (current) {
                return { ...prev, [item.id]: { ...current, quantity: current.quantity + 1 } };
            }
            return { ...prev, [item.id]: { ...item, quantity: 1 } };
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const current = prev[itemId];
            if (!current) return prev;
            if (current.quantity <= 1) {
                const newCart = { ...prev };
                delete newCart[itemId];
                return newCart;
            }
            return { ...prev, [itemId]: { ...current, quantity: current.quantity - 1 } };
        });
    };

    const cartItemsList = Object.values(cart);
    const cartTotal = cartItemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);

    const handleCheckout = () => {
        if (cartCount === 0) return;
        navigate(`/dine-in/${tableNumber}/checkout`, { state: { cartItems: cartItemsList, totalAmount: cartTotal, tableNumber } });
    };

    const scrollToCategory = (category) => {
        setShowCategoryModal(false);
        const ref = categoryRefs.current[category];
        if (ref) {
            const yOffset = -120; // offset for sticky header
            const y = ref.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const handleTrackOrder = async (e) => {
        e.preventDefault();
        if (!trackPhone || trackPhone.length < 10) {
            setTrackingError('Enter a valid phone number');
            return;
        }
        
        setTrackingLoading(true);
        setTrackingError('');
        try {
            const q = query(
                collection(db, 'dineInOrders'), 
                where('customerPhone', '==', trackPhone)
            );
            const snap = await getDocs(q);
            const fetchedOrders = [];
            snap.forEach(doc => fetchedOrders.push({ id: doc.id, ...doc.data() }));
            fetchedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTrackedOrders(fetchedOrders);
            if(fetchedOrders.length === 0) setTrackingError('No active orders found.');
        } catch (error) {
            console.error(error);
            setTrackingError('Failed to fetch orders');
        } finally {
            setTrackingLoading(false);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm pt-6 pb-4 px-4">
                <div className="max-w-4xl mx-auto flex flex-col space-y-4">
                    <div className="flex justify-between items-center relative h-12">
                        <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 absolute left-0">
                            <Utensils className="w-4 h-4 mr-1.5" />
                            <span className="font-bold text-sm">Table {tableNumber}</span>
                        </div>

                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                            <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full"></div>
                            <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain scale-[2] relative z-10 drop-shadow-sm" />
                        </div>

                        <button 
                            onClick={() => setShowTrackModal(true)}
                            className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors shadow-sm absolute right-0"
                        >
                            Track Order
                        </button>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search delicious food..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-gray-100 border-transparent rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-500 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Menu Items (Same UI as Home Dashboard) */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
                {Object.entries(menuByCategory).map(([category, items]) => {
                    const isExpanded = expandedCategories[category];
                    // If searching, show all items matching search. Otherwise limit to 3.
                    const displayItems = (isExpanded || searchQuery) ? items : items.slice(0, 3);

                    return (
                        <div key={category} ref={el => categoryRefs.current[category] = el}>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center">
                                {category}
                                <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{items.length}</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {displayItems.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex space-x-4 hover:shadow-md transition-shadow">
                                        <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                                            {item.imageUrl || item.image ? (
                                                <img src={item.imageUrl || item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Utensils className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                                        item.foodType === 'non-veg' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                        item.foodType === 'egg' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                                        'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                        {item.foodType || 'veg'}
                                                    </span>
                                                </div>
                                                
                                                {item.totalRatings > 0 && (
                                                    <div className="flex items-center space-x-1 mb-1">
                                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                                        <span className="text-xs font-bold text-gray-700">{Number(item.averageRating).toFixed(1)}</span>
                                                        <span className="text-[10px] font-medium text-gray-400">({item.totalRatings})</span>
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="font-bold text-gray-900">₹{item.price}</span>
                                                
                                                {cart[item.id] ? (
                                                    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1 border border-gray-200">
                                                        <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-sm text-red-500">
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <span className="font-bold text-sm w-4 text-center">{cart[item.id].quantity}</span>
                                                        <button onClick={() => addToCart(item)} className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-sm text-green-500">
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => addToCart(item)}
                                                        className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {!searchQuery && items.length > 3 && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                        className="flex items-center text-gray-500 font-bold text-sm hover:text-amber-600 transition-colors py-2 px-4 rounded-xl hover:bg-amber-50"
                                    >
                                        {isExpanded ? (
                                            <>View Less <ChevronUp className="w-4 h-4 ml-1" /></>
                                        ) : (
                                            <>View More <ChevronDown className="w-4 h-4 ml-1" /></>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {Object.keys(menuByCategory).length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-6">
                        <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No items found</h3>
                        <p className="text-gray-500 mt-1">Try searching for something else.</p>
                    </div>
                )}
            </div>

            {/* Menu Float Button (Zomato style) */}
            <div className="fixed bottom-24 right-4 z-40">
                <button 
                    onClick={() => setShowCategoryModal(true)}
                    className="bg-gray-900 text-white rounded-full px-5 py-3 shadow-xl flex items-center space-x-2 hover:bg-gray-800 transition-transform hover:scale-105 active:scale-95"
                >
                    <Map className="w-4 h-4" />
                    <span className="font-bold text-sm uppercase tracking-wider">Menu</span>
                </button>
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-6 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleCheckout}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between group hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <div className="flex items-center">
                                <div className="bg-white/20 p-2 rounded-xl mr-4">
                                    <ShoppingBag className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs text-white/80 font-semibold uppercase tracking-widest mb-0.5">{cartCount} Items</div>
                                    <div className="font-black text-lg">₹{cartTotal}</div>
                                </div>
                            </div>
                            <div className="flex items-center font-bold tracking-wide">
                                Checkout
                                <div className="w-8 h-8 bg-white text-orange-500 rounded-full flex items-center justify-center ml-3 group-hover:translate-x-1 transition-transform">
                                    →
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
                    <div className="bg-white w-full sm:w-80 max-h-[70vh] rounded-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Categories</h3>
                            <button onClick={() => setShowCategoryModal(false)} className="p-1 text-gray-400 hover:text-gray-900 bg-gray-200/50 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                            {Object.keys(menuByCategory).map((catName) => (
                                <button 
                                    key={catName} 
                                    onClick={() => scrollToCategory(catName)}
                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 font-semibold text-gray-700 flex justify-between items-center transition-colors"
                                >
                                    <span>{catName}</span>
                                    <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{menuByCategory[catName].length}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking Modal */}
            {showTrackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="font-black text-gray-900 text-lg flex items-center">
                                <SearchIcon className="w-5 h-5 mr-2 text-amber-500" />
                                Track Order
                            </h3>
                            <button onClick={() => setShowTrackModal(false)} className="p-1.5 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6 flex-1 bg-gray-50/50">
                            <form onSubmit={handleTrackOrder} className="mb-6 relative">
                                <input
                                    type="tel"
                                    value={trackPhone}
                                    onChange={(e) => setTrackPhone(e.target.value)}
                                    placeholder="Enter your phone number..."
                                    className="w-full bg-white border-2 border-gray-200 focus:border-amber-500 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 outline-none transition-all pr-14"
                                />
                                <button 
                                    type="submit"
                                    disabled={trackingLoading}
                                    className="absolute right-2 top-2 bottom-2 bg-amber-500 text-white rounded-xl px-4 flex items-center justify-center disabled:opacity-50 transition-colors"
                                >
                                    {trackingLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SearchIcon className="w-4 h-4" />}
                                </button>
                            </form>
                            
                            {trackingError && (
                                <div className="text-center p-3 text-red-500 font-bold text-sm bg-red-50 rounded-xl mb-4 border border-red-100">
                                    {trackingError}
                                </div>
                            )}

                            <div className="space-y-4">
                                {trackedOrders.map(order => {
                                    const step = getStatusStep(order.status);
                                    return (
                                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Order #{generateNumericId(order.id)}</div>
                                                    <div className="font-black text-gray-900 text-lg text-amber-600">₹{order.totalAmount}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-500">
                                                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative mb-6">
                                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>
                                                <div className="absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 rounded-full z-0 transition-all duration-500" 
                                                    style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}>
                                                </div>
                                                <div className="relative z-10 flex justify-between px-1">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                            <Clock className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                            <ChefHat className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${step >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between mt-2 px-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${step >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>Received</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${step >= 2 ? 'text-amber-600' : 'text-gray-400'}`}>Preparing</span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${step >= 3 ? 'text-amber-600' : 'text-gray-400'}`}>Served</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 border-t border-gray-100 pt-4">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <span className="font-semibold text-gray-700 text-xs flex items-center"><span className="w-1 h-1 rounded-full bg-gray-300 mr-2 shrink-0"></span>{item.name}</span>
                                                        <span className="font-bold text-gray-500 text-xs bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DineInMenu;
