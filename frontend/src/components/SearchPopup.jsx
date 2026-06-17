import React, { useState, useEffect } from 'react';
import { Search, X, Utensils, ArrowRight, Home, Calendar, ShoppingBag, User, Gift, UtensilsCrossed, PartyPopper, Image, Info, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Define static pages for global search
const PAGES = [
    { id: 'p1', name: 'Home', path: '/', type: 'page', icon: Home, desc: 'Go to main dashboard' },
    { id: 'p2', name: 'Menu', path: '/menu', type: 'page', icon: Utensils, desc: 'Browse all instant dishes' },
    { id: 'p3', name: 'Meal Plans', path: '/plans', type: 'page', icon: Calendar, desc: 'Subscribe to daily meals' },
    { id: 'p4', name: 'My Profile', path: '/profile', type: 'page', icon: User, desc: 'Manage account settings' },
    { id: 'p5', name: 'My Orders', path: '/orders', type: 'page', icon: ShoppingBag, desc: 'View past orders' },
    { id: 'p6', name: 'Rewards', path: '/rewards', type: 'page', icon: Gift, desc: 'Claim your loyalty coupons' },
    { id: 'p7', name: 'Catering', path: '/catering', type: 'page', icon: UtensilsCrossed, desc: 'Book bulk catering' },
    { id: 'p8', name: 'Events', path: '/events', type: 'page', icon: PartyPopper, desc: 'Book events and venues' },
    { id: 'p9', name: 'Gallery', path: '/gallery', type: 'page', icon: Image, desc: 'View our photos' },
    { id: 'p10', name: 'About Us', path: '/about', type: 'page', icon: Info, desc: 'Learn more about us' },
];

const SearchPopup = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && menuItems.length === 0) {
            fetchData();
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Main Menu
            const menuQ = query(collection(db, 'mainMenu'), where('status', '==', 'active'));
            const snap = await getDocs(menuQ);
            const data = [];
            snap.forEach(doc => data.push({ id: doc.id, type: 'main_menu', ...doc.data() }));

            // Fetch Subscription Menu
            const subQ = query(collection(db, 'subscriptionMenu'), where('status', '==', 'active'));
            const subSnap = await getDocs(subQ);
            subSnap.forEach(doc => data.push({ id: doc.id, type: 'sub_menu', ...doc.data() }));

            setMenuItems(data);
        } catch (error) {
            console.error("Error fetching for search", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const queryLower = searchQuery.toLowerCase().trim();
    
    // Filter database items
    const filteredDbItems = queryLower 
        ? menuItems.filter(item => 
            item.name.toLowerCase().includes(queryLower) || 
            (item.description && item.description.toLowerCase().includes(queryLower))
          )
        : [];

    // Filter static pages
    const filteredPages = queryLower
        ? PAGES.filter(page => 
            page.name.toLowerCase().includes(queryLower) || 
            page.desc.toLowerCase().includes(queryLower)
          )
        : [];

    const hasResults = filteredDbItems.length > 0 || filteredPages.length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col pt-16 md:pt-24 px-4 items-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                {/* Search Input */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-2xl blur-lg transition-all group-hover:bg-orange-500/30"></div>
                    <div className="relative bg-white rounded-2xl shadow-xl flex items-center h-14 overflow-hidden border border-white/50">
                        <Search className="w-6 h-6 ml-4 text-gray-400" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Search dishes, plans, or pages..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-full bg-transparent px-4 text-gray-900 text-lg font-medium focus:outline-none"
                        />
                        <button onClick={onClose} className="p-4 text-gray-400 hover:text-gray-900 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Results List */}
                {searchQuery && (
                    <div className="mt-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto border border-white/40">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-sm font-medium">Searching everything...</p>
                            </div>
                        ) : hasResults ? (
                            <div className="divide-y divide-gray-100/50">
                                {/* Render Pages */}
                                {filteredPages.map(page => {
                                    const Icon = page.icon;
                                    return (
                                    <div 
                                        key={page.id}
                                        onClick={() => {
                                            onClose();
                                            navigate(page.path);
                                        }}
                                        className="p-4 flex items-center space-x-4 hover:bg-orange-50/50 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{page.name}</h4>
                                            <p className="text-sm font-medium text-gray-500">{page.desc}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg shrink-0">
                                            Page
                                        </div>
                                    </div>
                                    );
                                })}

                                {/* Render Menu Items */}
                                {filteredDbItems.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => {
                                            onClose();
                                            if (item.type === 'sub_menu') {
                                                navigate('/plans');
                                            } else {
                                                navigate('/menu');
                                            }
                                        }}
                                        className="p-4 flex items-center space-x-4 hover:bg-orange-50/50 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                            ) : (
                                                <Utensils className="w-5 h-5 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">{item.name}</h4>
                                            <p className="text-sm font-black text-gray-600 mt-0.5">
                                                {item.price ? `₹${item.price}` : 'View Details'}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 ${item.type === 'sub_menu' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {item.type === 'sub_menu' ? 'Subscription' : 'Menu'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                <p className="font-medium">No results found for "{searchQuery}"</p>
                                <p className="text-sm mt-1 text-gray-400">Try searching for "Plans", "Rewards", or a dish name!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Click outside to close */}
            <div className="absolute inset-0 z-[-1]" onClick={onClose}></div>
        </div>
    );
};

export default SearchPopup;
