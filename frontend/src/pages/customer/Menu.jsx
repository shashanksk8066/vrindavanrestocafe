import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Utensils, Star, ShoppingBag, Plus, Minus, Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import LoginPopup from '../../components/LoginPopup';

const Menu = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [categories, setCategories] = useState([]);
    const [mainMenu, setMainMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [instantEnabled, setInstantEnabled] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Cart state: { itemId: quantity }
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('guestCart');
            return savedCart ? JSON.parse(savedCart) : {};
        } catch {
            return {};
        }
    });

    // Save cart to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('guestCart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                // Fetch categories
                const catQ = query(collection(db, 'categories'), where('status', '==', 'active'));
                const catSnap = await getDocs(catQ);
                const catData = [];
                catSnap.forEach(doc => catData.push({ id: doc.id, ...doc.data() }));
                catData.sort((a, b) => {
                    const orderA = (!a.order || a.order === 0) ? 999 : a.order;
                    const orderB = (!b.order || b.order === 0) ? 999 : b.order;
                    return orderA - orderB;
                });
                setCategories(catData);

                // Fetch Main Menu items for Instant Orders
                const menuQ = query(collection(db, 'mainMenu'), where('status', '==', 'active'));
                const menuSnap = await getDocs(menuQ);
                const menuData = [];
                menuSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            }
                    }
                    menuData.push({ id: doc.id, ...data });
                });
                setMainMenu(menuData);

                // Fetch global settings for instant orders toggle
                const settingsSnap = await getDoc(doc(db, 'appSettings', 'global'));
                if (settingsSnap.exists()) {
                    setInstantEnabled(settingsSnap.data().instantOrdersEnabled ?? true);
                }

            } catch (error) {
                console.error("Error fetching menu data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, []);

    const handleUpdateCart = (itemId, delta) => {
        setCart(prev => {
            const current = prev[itemId] || 0;
            const next = current + delta;
            if (next <= 0) {
                const newCart = { ...prev };
                delete newCart[itemId];
                return newCart;
            }
            return { ...prev, [itemId]: next };
        });
    };

    const getCartTotal = () => {
        let total = 0;
        let count = 0;
        Object.entries(cart).forEach(([itemId, qty]) => {
            const item = mainMenu.find(m => m.id === itemId);
            if (item) {
                total += ((item.price + (item.parcelCharges || 0)) * qty);
                count += qty;
            }
        });
        return { total, count };
    };

    const handleCheckout = () => {
        if (!user) {
            setShowLoginPopup(true);
            return;
        }

        const cartItemsArray = [];
        Object.entries(cart).forEach(([itemId, qty]) => {
            const item = mainMenu.find(m => m.id === itemId);
            if (item) {
                cartItemsArray.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    parcelCharges: item.parcelCharges || 0,
                    image: item.imageUrl || item.image,
                    quantity: qty
                });
            }
        });

        const { total } = getCartTotal();

        navigate('/checkout', {
            state: {
                isInstantOrder: true,
                cartItems: cartItemsArray,
                totalAmount: total
            }
        });
    };

    const { total: cartTotal, count: cartCount } = getCartTotal();

    const filteredMenu = mainMenu.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const menuByCategory = filteredMenu.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const orderedCategories = categories.map(c => c.name);
    const sortedMenuEntries = Object.entries(menuByCategory).sort(([catA], [catB]) => {
        const indexA = orderedCategories.indexOf(catA);
        const indexB = orderedCategories.indexOf(catB);
        const wA = indexA === -1 ? 999 : indexA;
        const wB = indexB === -1 ? 999 : indexB;
        return wA - wB;
    });

    useEffect(() => {
        if (location.state?.category) {
            setSelectedCategory(location.state.category);
            // Clear the state so it doesn't force this category on subsequent navigation within the menu
            window.history.replaceState({}, document.title);
        } else if (!searchQuery && !selectedCategory && sortedMenuEntries.length > 0) {
            setSelectedCategory(sortedMenuEntries[0][0]);
        }
    }, [sortedMenuEntries, selectedCategory, searchQuery, location.state]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-0 pb-24 relative">
            <section className="pt-4 md:pt-8">
                <div className="flex flex-col items-center mb-6 px-4 md:px-0">
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="flex items-center space-x-3">
                            <Utensils className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
                            <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">
                                Our Menu
                            </h2>
                            <Utensils className="w-7 h-7 md:w-8 md:h-8 text-orange-500" />
                        </div>
                        <div className="h-1 w-20 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full mt-3"></div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="w-full max-w-2xl relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search for dishes, cravings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-gray-900 placeholder-gray-400 font-medium"
                        />
                    </div>
                </div>

                {!instantEnabled && (
                    <div className="flex justify-center mb-6">
                        <span className="text-xs font-bold text-red-600 bg-white border border-red-200 shadow-sm px-4 py-1.5 rounded-full flex items-center">
                            <Info className="w-3.5 h-3.5 mr-1.5" /> Currently Closed
                        </span>
                    </div>
                )}

                {/* Categories Zomato-style Scroller */}
                {categories && categories.length > 0 && !searchQuery && (
                    <>
                        <div className="px-4 md:px-0">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                                What's on your mind?
                            </h3>
                        </div>
                        <div className="flex overflow-x-auto gap-2 md:gap-4 px-4 md:px-0 mb-8 pb-4 hide-scrollbar snap-x">
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat.name;
                            return (
                            <div 
                                key={cat.id} 
                                className={`flex flex-col items-center shrink-0 cursor-pointer group snap-start transition-all p-2 rounded-xl ${isSelected ? 'bg-orange-50 border border-orange-200' : 'border border-transparent hover:bg-gray-50'}`}
                                onClick={() => setSelectedCategory(cat.name)}
                            >
                                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 transition-all flex items-center justify-center bg-white rounded-full overflow-hidden border border-gray-100 shadow-sm">
                                    {cat.imageUrl || cat.image ? (
                                        <img 
                                            src={(cat.imageUrl || cat.image)} 
                                            alt={cat.name} 
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 p-1" 
                                        loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 group-hover:text-orange-400 transition-colors">
                                            <Utensils className="w-8 h-8 md:w-10 md:h-10" />
                                        </div>
                                    )}
                                </div>
                                <span className="mt-2 text-[12px] sm:text-[14px] md:text-base font-bold text-gray-700 text-center w-20 sm:w-24 md:w-28 truncate">{cat.name}</span>
                            </div>
                        )})}
                    </div>
                    </>
                )}
                
                <div className="space-y-8 mt-4">
                    {Object.keys(menuByCategory).length === 0 ? (
                        <p className="text-gray-500 text-center text-sm py-8">No items found matching "{searchQuery}"</p>
                    ) : (
                        sortedMenuEntries.filter(([category]) => searchQuery || category === selectedCategory).map(([category, items]) => {
                            return (
                                <div key={category} className="animate-in fade-in duration-300">
                                    <h3 id={`category-${category.replace(/\s+/g, '-')}`} className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center px-4 md:px-0">
                                        {category}
                                        <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-0">
                                        {items.map(item => (
                                            <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex space-x-4 hover:shadow-md transition-shadow">
                                                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
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
                                                        
                                                        {!instantEnabled ? (
                                                            <span className="px-3 py-1 bg-gray-100 text-gray-500 font-bold rounded-lg text-xs uppercase tracking-wider border border-gray-200">Closed</span>
                                                        ) : cart[item.id] ? (
                                                            <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1 border border-gray-200">
                                                                <button onClick={() => handleUpdateCart(item.id, -1)} className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-sm text-red-500">
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <span className="font-bold text-sm w-4 text-center">{cart[item.id]}</span>
                                                                <button onClick={() => handleUpdateCart(item.id, 1)} className="w-7 h-7 bg-white rounded flex items-center justify-center shadow-sm text-green-500">
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleUpdateCart(item.id, 1)}
                                                                className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Sticky Cart Footer */}
            {cartCount > 0 && (
                <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black text-white rounded-2xl shadow-2xl p-4 flex justify-between items-center z-50 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-300 font-medium">{cartCount} Item{cartCount > 1 ? 's' : ''}</p>
                            <p className="font-bold text-lg leading-none">₹{cartTotal}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors"
                    >
                        Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            )}

            <LoginPopup 
                isOpen={showLoginPopup} 
                onClose={() => setShowLoginPopup(false)} 
                message="Please login or create an account to place your order." 
            />
        </div>
    );
};

export default Menu;
