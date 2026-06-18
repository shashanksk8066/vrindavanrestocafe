import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { Calendar, Save, CheckSquare, Square, Loader2 } from 'lucide-react';

const DailySchedule = () => {
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [mealType, setMealType] = useState('Lunch');
    
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedAddonCategory, setSelectedAddonCategory] = useState(null);
    const [loadingItems, setLoadingItems] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch master subscription menu items and addons
    const fetchAvailableItems = async () => {
        setLoadingItems(true);
        try {
            // Fetch all active items from subscriptionMenu
            const q = query(collection(db, 'subscriptionMenu'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            const items = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.category && data.category.toLowerCase().includes(mealType.toLowerCase())) {
                    items.push({ id: doc.id, ...data });
                }
            });
            if (items.length === 0) {
                const snapshotAll = await getDocs(collection(db, 'subscriptionMenu'));
                snapshotAll.forEach(doc => {
                    if (doc.data().status === 'active') {
                        items.push({ id: doc.id, ...doc.data() });
                    }
                });
            }
            setAvailableItems(items);

            // Fetch active addons from mainMenu (Show all main menu items as requested)
            const addonQ = query(collection(db, 'mainMenu'), where('status', '==', 'active'));
            const addonSnap = await getDocs(addonQ);
            const addons = [];
            addonSnap.forEach(doc => {
                addons.push({ id: doc.id, ...doc.data() });
            });
            setAvailableAddons(addons);

            // Fetch categories
            const catQ = query(collection(db, 'subscriptionCategories'), where('status', '==', 'active'));
            const catSnap = await getDocs(catQ);
            const catData = [];
            catSnap.forEach(doc => catData.push({ id: doc.id, ...doc.data() }));
            catData.sort((a, b) => {
                const orderA = (!a.order || a.order === 0) ? 999 : a.order;
                const orderB = (!b.order || b.order === 0) ? 999 : b.order;
                return orderA - orderB;
            });
            setCategories(catData);

        } catch (error) {
            console.error("Error fetching items", error);
        } finally {
            setLoadingItems(false);
        }
    };

    // Fetch currently scheduled items for this date & mealType
    const fetchSchedule = async () => {
        setLoadingItems(true);
        try {
            const scheduleId = `${date}_${mealType.toLowerCase()}`;
            const scheduleRef = collection(db, 'dailyMenus');
            const q = query(scheduleRef, where('scheduleId', '==', scheduleId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const scheduleData = snapshot.docs[0].data();
                setSelectedItemIds(scheduleData.itemIds || []);
                setSelectedAddonIds(scheduleData.addonIds || []);
            } else {
                setSelectedItemIds([]);
                setSelectedAddonIds([]);
            }
        } catch (error) {
            console.error("Error fetching schedule", error);
        }
    };

    useEffect(() => {
        fetchAvailableItems();
        fetchSchedule();
    }, [date, mealType]);

    // Automatically select the first category if none is selected
    useEffect(() => {
        if (availableAddons.length > 0 && !selectedAddonCategory) {
            const uniqueCats = [...new Set(availableAddons.map(a => a.category || 'Other'))];
            if (uniqueCats.length > 0) setSelectedAddonCategory(uniqueCats[0]);
        }
    }, [availableAddons, selectedAddonCategory]);

    const toggleItem = (id) => {
        setSelectedItemIds(prev => 
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const toggleAddon = (id) => {
        setSelectedAddonIds(prev => 
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const scheduleId = `${date}_${mealType.toLowerCase()}`;
            
            // Map selected IDs back to full item objects so frontend can easily display them
            const itemsToSave = availableItems
                .filter(item => selectedItemIds.includes(item.id))
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    imageUrl: item.imageUrl || null
                }));

            const addonsToSave = availableAddons
                .filter(addon => selectedAddonIds.includes(addon.id))
                .map(addon => ({
                    id: addon.id,
                    name: addon.name,
                    description: addon.description || '',
                    price: addon.price,
                    parcelCharges: addon.parcelCharges || 0,
                    imageUrl: addon.imageUrl || null,
                    category: addon.category || 'Other'
                }));

            await setDoc(doc(db, 'dailyMenus', scheduleId), {
                scheduleId,
                date,
                mealType,
                itemIds: selectedItemIds,
                items: itemsToSave,
                addonIds: selectedAddonIds,
                addons: addonsToSave,
                updatedAt: new Date().toISOString()
            });
            
            alert('Daily schedule saved successfully!');
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Daily Menu Schedule</h1>
                <p className="text-gray-500">Plan what meals are available for subscribers each day.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8 relative overflow-hidden">
                {/* Decorative background blur */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Date</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 hover:border-gray-200 transition-colors font-medium text-gray-700 outline-none" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Meal Type</label>
                        <select 
                            value={mealType} 
                            onChange={(e) => setMealType(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50/50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 hover:border-gray-200 transition-colors font-medium text-gray-700 outline-none appearance-none"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                            {categories.length === 0 && <option value="Lunch">Lunch (Fallback)</option>}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="font-bold text-lg text-gray-900">Available Items for {mealType}</h2>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{selectedItemIds.length} items selected</span>
                </div>
                
                {loadingItems ? (
                    <div className="p-24 text-center text-gray-500 flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                        <span className="font-medium">Loading items...</span>
                    </div>
                ) : availableItems.length === 0 ? (
                    <div className="p-24 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No Items Found</h3>
                        <p className="mt-2">No active items found in the Subscription Menu for {mealType}.<br/>Please add items in the Menu Management tab first.</p>
                    </div>
                ) : (
                    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-gray-50/30">
                        {availableItems.map(item => {
                            const isSelected = selectedItemIds.includes(item.id);
                            return (
                                <div 
                                    key={item.id} 
                                    onClick={() => toggleItem(item.id)}
                                    className={`relative bg-white rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col ${
                                        isSelected 
                                            ? 'border-amber-500 shadow-lg shadow-amber-500/20 translate-y-0' 
                                            : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-amber-300 hover:-translate-y-1'
                                    }`}
                                >
                                    {/* Selection Checkmark */}
                                    <div className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-amber-500 text-white shadow-md scale-100' : 'bg-black/20 text-white/50 backdrop-blur-sm scale-0 group-hover:scale-100'
                                    }`}>
                                        <CheckSquare className="h-4 w-4" />
                                    </div>

                                    {/* Image */}
                                    <div className="h-40 w-full bg-gray-100 relative">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200/50">
                                                No Image
                                            </div>
                                        )}
                                        {/* Overlay to ensure text readability if needed later, or just for styling */}
                                        <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-amber-500/10' : 'bg-transparent group-hover:bg-black/5'}`}></div>
                                    </div>
                                    
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className={`font-bold text-lg mb-1 transition-colors ${isSelected ? 'text-amber-600' : 'text-gray-900'}`}>{item.name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className="p-6 border-t border-gray-100 bg-white">
                    {/* Placeholder to just separate the sections, or we can leave it connected */}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col mb-8">
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="font-bold text-lg text-gray-900">Available Add-ons for {mealType}</h2>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{selectedAddonIds.length} add-ons selected</span>
                </div>
                
                {loadingItems ? (
                    <div className="p-24 text-center text-gray-500 flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                        <span className="font-medium">Loading add-ons...</span>
                    </div>
                ) : availableAddons.length === 0 ? (
                    <div className="p-24 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No Add-ons Found</h3>
                        <p className="mt-2">No active add-ons found in the Main Menu.<br/>Please add items and mark them as 'Add-on' in the Menu Management tab.</p>
                    </div>
                ) : (
                    <div className="p-6 bg-gray-50/30">
                        {/* Categories Scroller */}
                        <div className="flex overflow-x-auto gap-2 md:gap-4 pb-6 hide-scrollbar snap-x border-b border-gray-100 mb-6">
                            {[...new Set(availableAddons.map(a => a.category || 'Other'))].map(catName => {
                                const isSelected = selectedAddonCategory === catName;
                                const catData = categories.find(c => c.name === catName);
                                return (
                                    <div 
                                        key={catName} 
                                        className={`flex flex-col items-center shrink-0 cursor-pointer group snap-start transition-all p-2 rounded-xl ${isSelected ? 'bg-orange-50 border border-orange-200' : 'border border-transparent hover:bg-gray-50'}`}
                                        onClick={() => setSelectedAddonCategory(catName)}
                                    >
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 transition-all flex items-center justify-center bg-white rounded-full overflow-hidden border border-gray-100 shadow-sm">
                                            {catData && (catData.imageUrl || catData.image) ? (
                                                <img 
                                                    src={(catData.imageUrl || catData.image)} 
                                                    alt={catName} 
                                                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 p-1" 
                                                />
                                            ) : (
                                                <div className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{catName.slice(0,3)}</div>
                                            )}
                                        </div>
                                        <span className="mt-2 text-[11px] sm:text-[12px] font-bold text-gray-700 text-center w-16 sm:w-20 truncate">{catName}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Addons Grid for Selected Category */}
                        {selectedAddonCategory && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                                {availableAddons.filter(a => (a.category || 'Other') === selectedAddonCategory).map(addon => {
                                    const isSelected = selectedAddonIds.includes(addon.id);
                                    return (
                                        <div 
                                            key={addon.id} 
                                            onClick={() => toggleAddon(addon.id)}
                                            className={`relative bg-white rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col ${
                                                isSelected 
                                                    ? 'border-amber-500 shadow-lg shadow-amber-500/20 translate-y-0' 
                                                    : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-amber-300 hover:-translate-y-1'
                                            }`}
                                        >
                                            <div className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                isSelected ? 'bg-amber-500 text-white shadow-md scale-100' : 'bg-black/20 text-white/50 backdrop-blur-sm scale-0 group-hover:scale-100'
                                            }`}>
                                                <CheckSquare className="h-4 w-4" />
                                            </div>

                                            <div className="h-40 w-full bg-gray-100 relative">
                                                {addon.imageUrl ? (
                                                    <img src={addon.imageUrl} alt={addon.name} className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200/50">
                                                        No Image
                                                    </div>
                                                )}
                                                <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-amber-500/10' : 'bg-transparent group-hover:bg-black/5'}`}></div>
                                            </div>
                                            
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className={`font-bold text-lg mb-1 transition-colors ${isSelected ? 'text-amber-600' : 'text-gray-900'}`}>{addon.name}</h3>
                                                <p className="text-xs text-gray-500 line-clamp-2">{addon.description}</p>
                                                <p className="text-sm font-bold text-gray-900 mt-2">₹{addon.price}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                        {saving ? 'Saving...' : `Publish Menu for ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailySchedule;
