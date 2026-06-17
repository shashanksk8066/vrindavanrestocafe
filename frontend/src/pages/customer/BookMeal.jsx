import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Minus, Plus, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react';

const BookMeal = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const bookingSub = state?.subscription;
    const plans = state?.plans || [];
    const mainMenu = state?.mainMenu || [];

    const [dailyMenu, setDailyMenu] = useState([]);
    const [dailyAddons, setDailyAddons] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [selectedMenuItems, setSelectedMenuItems] = useState([]);
    const [selectedAddOns, setSelectedAddOns] = useState({});
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        if (!bookingSub) {
            navigate('/plans');
            return;
        }

        const fetchDailyMenuAndCategories = async () => {
            try {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const scheduleId = `${dateStr}_${bookingSub.mealType.toLowerCase()}`;
                
                const scheduleQ = query(collection(db, 'dailyMenus'), where('scheduleId', '==', scheduleId));
                const snap = await getDocs(scheduleQ);
                
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    setDailyMenu(data.items || []);
                    setDailyAddons(data.addons || []);
                }

                const catQ = query(collection(db, 'categories'), where('status', '==', 'active'));
                const catSnap = await getDocs(catQ);
                const catData = [];
                catSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            data.imageUrl = data.imageUrl.replace(/https:\/\/[^\/]+/, `http://${window.location.hostname}:5050`);
                        } else if (data.imageUrl.includes('localhost')) {
                            data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                        }
                    }
                    catData.push({ id: doc.id, ...data });
                });
                catData.sort((a, b) => {
                    const orderA = (!a.order || a.order === 0) ? 999 : a.order;
                    const orderB = (!b.order || b.order === 0) ? 999 : b.order;
                    return orderA - orderB;
                });
                setCategories(catData);
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoadingMenu(false);
            }
        };

        fetchDailyMenuAndCategories();
    }, [bookingSub, navigate]);

    if (!bookingSub) return null;

    const groupSize = bookingSub?.groupSize || 1;
    const maxSelectable = Math.min(groupSize, bookingSub?.remainingMeals || 1);

    const toggleMenuItem = (id) => {
        setSelectedMenuItems([id]);
    };

    const handleMenuItemQuantity = (id, delta) => {
        setSelectedMenuItems(prev => {
            const count = prev.filter(i => i === id).length;
            const total = prev.length;
            
            if (delta > 0) {
                if (total >= maxSelectable) {
                    alert(`You can only select up to ${maxSelectable} meal(s) per day for this plan.`);
                    return prev;
                }
                return [...prev, id];
            } else {
                const index = prev.indexOf(id);
                if (index > -1) {
                    const newArr = [...prev];
                    newArr.splice(index, 1);
                    return newArr;
                }
                return prev;
            }
        });
    };

    const handleAddOnQuantity = (id, delta) => {
        setSelectedAddOns(prev => {
            const current = prev[id] || 0;
            const next = current + delta;
            if (next <= 0) {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            }
            return { ...prev, [id]: next };
        });
    };

    const handleBookMeal = () => {
        if (selectedMenuItems.length === 0 || selectedMenuItems.length > maxSelectable) {
            return alert(`Please select between 1 and ${maxSelectable} item(s) from the daily menu to redeem your subscription meal.`);
        }

        const addOnItemsArray = [];
        let addOnTotal = 0;

        Object.entries(selectedAddOns).forEach(([itemId, quantity]) => {
            if (quantity > 0) {
                const item = dailyAddons.find(m => m.id === itemId);
                if (item) {
                    addOnItemsArray.push({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        parcelCharges: item.parcelCharges || 0,
                        quantity,
                        image: item.imageUrl || item.image || ''
                    });
                    addOnTotal += ((item.price + (item.parcelCharges || 0)) * quantity);
                }
            }
        });

        const selectedMenuItemsData = selectedMenuItems.map(id => dailyMenu.find(item => item.id === id)).filter(Boolean);

        const d = new Date();
        d.setDate(d.getDate() + 1);
        // Ensure local IST date string
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset*60*1000));
        const dateStr = localDate.toISOString().split('T')[0];

        navigate('/checkout', {
            state: {
                subscription: bookingSub,
                selectedMenuItems,
                selectedMenuItemsData,
                addOnItems: addOnItemsArray,
                addOnTotal,
                date: dateStr,
                isSubscriptionBooking: true
            }
        });
    };

    const addonItems = dailyAddons;
    const addonsByCategory = addonItems.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    useEffect(() => {
        const availableCats = Object.keys(addonsByCategory);
        if (!selectedCategory && availableCats.length > 0) {
            setSelectedCategory(availableCats[0]);
        }
    }, [addonsByCategory, selectedCategory]);

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-black mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 flex flex-col justify-center items-center text-center shadow-sm">
                    <span className="block text-4xl font-black text-[#FF6B00] mb-1">{bookingSub.remainingMeals}</span>
                    <span className="text-xs text-orange-800 uppercase font-bold tracking-wider">Meals Remaining</span>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-center items-center text-center shadow-sm">
                    <span className="block text-xl font-bold text-gray-900 mb-1">{
                        (() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                        })()
                    }</span>
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Booking Date</span>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
                <h2 className="font-bold text-gray-900 mb-4 text-xl">Select {bookingSub.mealType}</h2>
                
                {loadingMenu ? (
                    <div className="text-center py-8 text-gray-500">Loading menu...</div>
                ) : dailyMenu.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-900 font-medium mb-2">Menu not available yet.</p>
                        <p className="text-sm text-gray-500">The kitchen hasn't published the menu for tomorrow's {bookingSub.mealType}. Please check back later!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dailyMenu.map(item => {
                            const qty = selectedMenuItems.filter(i => i === item.id).length;
                            const isSelected = selectedMenuItems.includes(item.id);
                            
                            if (groupSize > 1) {
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${qty > 0 ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-200 hover:border-orange-200 bg-white'}`}
                                    >
                                        <div className="flex items-center flex-1">
                                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover mr-4 shrink-0" />}
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900 text-sm md:text-base">{item.name}</h4>
                                                <p className="text-xs md:text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm shrink-0">
                                            <button 
                                                onClick={() => handleMenuItemQuantity(item.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black rounded-md transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
                                            <button 
                                                onClick={() => handleMenuItemQuantity(item.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black rounded-md transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            // Single plan UI
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => toggleMenuItem(item.id)}
                                    className={`flex items-center p-4 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 shrink-0 ${isSelected ? 'border-[#FF6B00] bg-[#FF6B00] text-white' : 'border-gray-300'}`}>
                                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                    {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover mr-4 shrink-0" />}
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm md:text-base">{item.name}</h4>
                                        <p className="text-xs md:text-sm text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add-ons Section */}
            {dailyMenu.length > 0 && addonItems.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
                    <h2 className="font-bold text-gray-900 mb-1">Add-ons from Main Menu</h2>
                    <p className="text-sm text-gray-500 mb-4">Craving something extra? Add it to your delivery.</p>
                    
                    <div className="flex overflow-x-auto gap-2 md:gap-4 pb-4 hide-scrollbar snap-x mb-2">
                        {Object.keys(addonsByCategory).map((catName) => {
                            const catData = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                            const isSelected = selectedCategory === catName;
                            return (
                                <div 
                                    key={catName} 
                                    className={`flex flex-col items-center shrink-0 cursor-pointer group snap-start transition-all p-2 rounded-xl ${isSelected ? 'bg-orange-50 border border-orange-200' : 'border border-transparent hover:bg-gray-50'}`}
                                    onClick={() => setSelectedCategory(catName)}
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 transition-all flex items-center justify-center bg-white rounded-full overflow-hidden border border-gray-100 shadow-sm">
                                        {catData && (catData.imageUrl || catData.image) ? (
                                            <img 
                                                src={(catData.imageUrl || catData.image).replace('localhost', window.location.hostname)} 
                                                alt={catName} 
                                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 p-1" 
                                            />
                                        ) : (
                                            <UtensilsCrossed className="w-8 h-8 text-gray-400 group-hover:text-orange-400 transition-colors" />
                                        )}
                                    </div>
                                    <span className="mt-2 text-[11px] sm:text-[12px] font-bold text-gray-700 text-center w-16 sm:w-20 truncate">{catName}</span>
                                </div>
                            );
                        })}
                    </div>

                    {selectedCategory && addonsByCategory[selectedCategory] && (
                        <div className="space-y-3 animate-in fade-in duration-300 border-t border-gray-100 pt-4">
                            <h3 className="font-bold text-[#FF6B00] mb-3 flex items-center">
                                {selectedCategory} Items
                            </h3>
                            {addonsByCategory[selectedCategory].map(item => {
                                const qty = selectedAddOns[item.id] || 0;
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50/50">
                                        <div className="flex items-center flex-1">
                                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover mr-4 shrink-0 shadow-sm" />}
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{item.name}</h4>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                        item.foodType === 'non-veg' ? 'bg-red-50 text-red-700 border-red-200' : 
                                                        item.foodType === 'egg' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                                        'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                        {item.foodType || 'veg'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[#FF6B00] font-black">₹{item.price}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                                            <button 
                                                onClick={() => handleAddOnQuantity(item.id, -1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black rounded-md transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
                                            <button 
                                                onClick={() => handleAddOnQuantity(item.id, 1)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-black rounded-md transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-transparent p-4 z-40 flex justify-center pb-8 md:pb-6 pointer-events-none">
                <div className="max-w-3xl w-full pointer-events-auto px-2 md:px-0">
                    <button 
                        onClick={handleBookMeal}
                        disabled={selectedMenuItems.length === 0 || selectedMenuItems.length > maxSelectable}
                        className="w-full bg-[#FF6B00] text-white shadow-[0_8px_30px_rgb(255,107,0,0.4)] hover:bg-[#FF8A00] hover:-translate-y-1 font-bold py-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:transform-none text-lg"
                    >
                        Continue to Checkout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookMeal;
