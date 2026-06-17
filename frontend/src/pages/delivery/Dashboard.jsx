import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { MapPin, Phone, Navigation2, Package, CheckCircle2, Clock, LogOut, Route, History, User, ChevronDown } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const SwipeButton = ({ onConfirm }) => {
    const [sliderWidth, setSliderWidth] = useState(300);
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            setSliderWidth(containerRef.current.offsetWidth);
        }
        const handleResize = () => {
            if (containerRef.current) setSliderWidth(containerRef.current.offsetWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [completed, setCompleted] = useState(false);
    
    const thumbWidth = 56;
    const maxDrag = Math.max(0, sliderWidth - thumbWidth - 8);

    const handleStart = (clientX) => {
        if (completed) return;
        setIsDragging(true);
        setStartX(clientX - offsetX);
    };
    
    const handleMove = (clientX) => {
        if (!isDragging || completed) return;
        let newX = clientX - startX;
        if (newX < 0) newX = 0;
        if (newX > maxDrag) newX = maxDrag;
        setOffsetX(newX);
    };

    const handleEnd = async () => {
        if (completed) return;
        setIsDragging(false);
        if (offsetX > maxDrag * 0.75) {
            setOffsetX(maxDrag);
            setCompleted(true);
            setTimeout(async () => {
                const success = await onConfirm();
                if (!success) {
                    setCompleted(false);
                    setOffsetX(0);
                }
            }, 300);
        } else {
            setOffsetX(0);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={`relative w-full h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner transition-colors ${completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-50 border-2 border-gray-100'}`}
        >
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 pointer-events-none transition-all duration-75"
                style={{ width: `${offsetX + (thumbWidth/2)}px`, transition: isDragging ? 'none' : 'width 0.3s ease-out', opacity: completed ? 0 : 1 }}
            ></div>
            
            <span className={`font-black text-sm tracking-widest z-0 transition-colors ${completed ? 'text-white' : 'text-gray-400 ml-8'}`}>
                {completed ? 'DELIVERED!' : 'SWIPE TO DELIVER'}
            </span>
            
            {!completed && (
                <div 
                    className="absolute top-1 left-1 h-14 w-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                    style={{ transform: `translateX(${offsetX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                    onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX)}
                    onTouchEnd={handleEnd}
                    onMouseDown={(e) => handleStart(e.clientX)}
                    onMouseMove={(e) => isDragging && handleMove(e.clientX)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                >
                    <div className="flex space-x-1">
                        <div className="w-1 h-4 rounded-full bg-white/40"></div>
                        <div className="w-1 h-4 rounded-full bg-white/70"></div>
                        <div className="w-1 h-4 rounded-full bg-white"></div>
                    </div>
                </div>
            )}
        </div>
    );
};


const DeliveryDashboard = () => {
    const { user, userData, logout } = useAuthStore();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, completedToday: 0 });
    const [activeTab, setActiveTab] = useState('route'); // 'route', 'history', 'profile'
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // Scale down UI for delivery dashboard
    useEffect(() => {
        document.documentElement.style.fontSize = '14px';
        return () => {
            document.documentElement.style.fontSize = ''; // Reset on unmount
        };
    }, []);

    const fetchDeliveries = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const [instantSnap, bookingSnap] = await Promise.all([
                getDocs(query(collection(db, 'instantOrders'), where('deliveryBoyId', '==', user.uid))),
                getDocs(query(collection(db, 'subscriptionBookings'), where('deliveryBoyId', '==', user.uid)))
            ]);

            const loadItems = [];
            const usersCache = {};
            const addressCache = {};

            const resolveUserAndAddress = async (data) => {
                if (data.userId && !usersCache[data.userId]) {
                    const uSnap = await getDoc(doc(db, 'users', data.userId));
                    if (uSnap.exists()) usersCache[data.userId] = uSnap.data();
                }
                if (data.addressId && !addressCache[data.addressId]) {
                    const aSnap = await getDoc(doc(db, 'addresses', data.addressId));
                    if (aSnap.exists()) addressCache[data.addressId] = aSnap.data();
                }
            };

            for (const d of instantSnap.docs) {
                const data = d.data();
                await resolveUserAndAddress(data);
                loadItems.push({ id: d.id, type: 'Instant', collectionName: 'instantOrders', ...data });
            }

            let menuItemsMap = {};
            if (!bookingSnap.empty) {
                const menusSnap = await getDocs(collection(db, 'subscriptionMenu'));
                const mainMenusSnap = await getDocs(collection(db, 'mainMenu'));
                menusSnap.forEach(d => { menuItemsMap[d.id] = d.data(); });
                mainMenusSnap.forEach(d => { menuItemsMap[d.id] = d.data(); });
            }

            for (const d of bookingSnap.docs) {
                const data = d.data();
                await resolveUserAndAddress(data);
                const mappedItems = [];
                if (data.menuItems) {
                    data.menuItems.forEach(i => {
                        const id = typeof i === 'string' ? i : i.id;
                        mappedItems.push({ name: menuItemsMap[id]?.name || 'Unknown', quantity: typeof i === 'string' ? 1 : (i.quantity || 1) });
                    });
                }
                if (data.addOnItems) {
                    data.addOnItems.forEach(i => {
                        const id = typeof i === 'string' ? i : i.id;
                        mappedItems.push({ name: `[Add-on] ${menuItemsMap[id]?.name || 'Unknown'}`, quantity: typeof i === 'string' ? 1 : (i.quantity || 1) });
                    });
                }
                data.items = mappedItems;
                loadItems.push({ id: d.id, type: 'Subscription', collectionName: 'subscriptionBookings', ...data });
            }

            const fullyResolved = loadItems.map(item => ({
                ...item,
                customer: usersCache[item.userId] || {},
                address: addressCache[item.addressId] || {}
            }));

            const parseTime = (slotStr) => {
                if (!slotStr || slotStr === 'No Slot') return 9999;
                const match = slotStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
                if (match) {
                    let h = parseInt(match[1]);
                    let m = parseInt(match[2]);
                    let ampm = match[3].toUpperCase();
                    if (ampm === 'PM' && h !== 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return h * 60 + m;
                }
                return 9999;
            };

            const sorted = fullyResolved.sort((a,b) => {
                if (a.status === 'delivered' && b.status !== 'delivered') return 1;
                if (a.status !== 'delivered' && b.status === 'delivered') return -1;
                
                if (a.type === 'Subscription' && b.type === 'Instant') return -1;
                if (a.type === 'Instant' && b.type === 'Subscription') return 1;

                if (a.type === 'Subscription' && b.type === 'Subscription') {
                    const timeA = parseTime(a.deliverySlot);
                    const timeB = parseTime(b.deliverySlot);
                    if (timeA !== timeB) return timeA - timeB;
                }

                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setDeliveries(sorted);

            let pendingCount = 0;
            let completedTodayCount = 0;
            sorted.forEach(item => {
                if (item.status !== 'delivered' && item.status !== 'completed') {
                    pendingCount++;
                } else {
                    const dDate = new Date(item.updatedAt || item.createdAt);
                    if (dDate >= startOfDay && dDate <= endOfDay) {
                        completedTodayCount++;
                    }
                }
            });

            setStats({ pending: pendingCount, completedToday: completedTodayCount });
        } catch (error) {
            console.error("Error fetching deliveries", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchDeliveries();
    }, [fetchDeliveries]);

    const markAsDelivered = async (item) => {
        if (!window.confirm(`Mark Order #${generateNumericId(item.id)} as delivered?`)) return false;
        try {
            await updateDoc(doc(db, item.collectionName, item.id), { 
                status: 'delivered',
                updatedAt: new Date().toISOString()
            });
            fetchDeliveries();
            return true;
        } catch (error) {
            console.error("Error updating status", error);
            alert("Failed to mark as delivered. Check connection.");
            return false;
        }
    };

    const openGoogleMaps = (addressObj) => {
        let dest = encodeURIComponent('Vrindavan Resto Cafe');
        if (addressObj?.lat && addressObj?.lng) {
            dest = encodeURIComponent(`${addressObj.lat},${addressObj.lng}`);
        } else if (addressObj?.coordinates) {
            dest = encodeURIComponent(addressObj.coordinates);
        } else if (addressObj?.fullAddress) {
            dest = encodeURIComponent(addressObj.fullAddress);
        } else if (addressObj?.address) {
            dest = encodeURIComponent(addressObj.address);
        } else if (typeof addressObj === 'string') {
            dest = encodeURIComponent(addressObj);
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
    };

    const routeDeliveries = deliveries.filter(item => item.status !== 'delivered' && item.status !== 'completed');
    
    const historyDeliveries = deliveries.filter(item => {
        if (item.status !== 'delivered' && item.status !== 'completed') return false;
        
        const itemDate = new Date(item.updatedAt || item.createdAt);
        const startOfDay = new Date(historyDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(historyDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        return itemDate >= startOfDay && itemDate <= endOfDay;
    });

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-white">
            <div className="text-center">
                <Package className="w-10 h-10 text-black mx-auto mb-4" />
                <p className="text-gray-500 font-medium tracking-wide text-sm">Syncing Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24 font-sans selection:bg-amber-100">
            
            <header className="bg-black text-white px-5 py-6 sticky top-0 z-20 shadow-xl rounded-b-[2rem]">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-center items-center mb-6 relative">
                        {/* Orange ambient glow behind logo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-20 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-xl pointer-events-none"></div>
                        <img src="/logo.png" alt="Vrindavan" className="h-12 w-auto relative z-10 drop-shadow-md" />
                    </div>
                    
                    {activeTab === 'route' && (
                        <div className="flex gap-4 animate-in fade-in duration-300">
                            <div className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Pending</p>
                                <p className="text-3xl font-black">{stats.pending}</p>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-2xl p-4 backdrop-blur-md">
                                <p className="text-orange-200 text-[10px] font-bold uppercase tracking-widest mb-1">Completed</p>
                                <p className="text-3xl font-black text-orange-400">{stats.completedToday}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md animate-in fade-in duration-300">
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Select Date</p>
                            <input 
                                type="date"
                                value={historyDate}
                                onChange={e => setHistoryDate(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white font-medium outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all"
                            />
                        </div>
                    )}
                    
                    {activeTab === 'profile' && (
                        <div className="animate-in fade-in duration-300 pt-2">
                            <p className="text-white/60 text-sm font-medium mb-1">Signed in as,</p>
                            <h2 className="text-3xl font-black text-white tracking-tight">{userData?.name || user?.email}</h2>
                        </div>
                    )}
                </div>
            </header>

            <main className="px-4 mt-8 max-w-lg mx-auto">
                
                {activeTab === 'route' && (
                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                        {routeDeliveries.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-2xl border border-gray-200">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                                    <CheckCircle2 className="h-8 w-8 text-black" />
                                </div>
                                <h3 className="text-lg font-bold text-black">Route Clear</h3>
                                <p className="text-gray-500 text-sm font-medium mt-2">No pending deliveries.</p>
                            </div>
                        ) : (
                            routeDeliveries.map(item => (
                                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                                    {/* Always Visible Header */}
                                    <div 
                                        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedOrderId(expandedOrderId === item.id ? null : item.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${item.type === 'Instant' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {item.type}
                                                    </span>
                                                    {item.deliverySlot && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                            {item.deliverySlot}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-base tracking-tight">Order #{generateNumericId(item.id)}</h3>
                                            </div>
                                            <div className="flex flex-col justify-between items-end h-full">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.status}</span>
                                                <div className="mt-3 bg-gray-50 p-1.5 rounded-full">
                                                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expandedOrderId === item.id ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expandable Details */}
                                    {expandedOrderId === item.id && (
                                        <div className="px-4 pb-4 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2.5">
                                                {/* Customer Block */}
                                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <div>
                                                        <p className="font-semibold text-black text-sm">{item.customer?.name || 'Unknown'}</p>
                                                        <p className="text-xs font-medium text-gray-500 mt-1">{item.customer?.phone || 'No Phone Number'}</p>
                                                    </div>
                                                    {item.customer?.phone && (
                                                        <a href={`tel:${item.customer.phone}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-green-50 to-green-100 text-green-600 flex items-center justify-center hover:from-green-100 hover:to-green-200 transition-all shrink-0 shadow-sm border border-green-200/50">
                                                            <Phone className="w-4 h-4 fill-current" />
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Navigation Block */}
                                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <div className="flex items-start pr-4">
                                                        <MapPin className="h-4 w-4 mr-3 text-black shrink-0 mt-0.5" />
                                                        <p className="text-xs font-medium text-gray-700 leading-relaxed">
                                                            {item.address?.fullAddress || 'No address provided'}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => openGoogleMaps(item.address)}
                                                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
                                                    >
                                                        <Navigation2 className="w-4 h-4 fill-current" />
                                                    </button>
                                                </div>

                                                {/* Items Block */}
                                                <div className="pt-2">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Order Items</p>
                                                    <ul className="space-y-2">
                                                        {item.items?.map((it, i) => (
                                                            <li key={i} className="text-xs text-gray-700 flex justify-between font-medium px-1">
                                                                <span className="flex items-center">
                                                                    <span className="w-1 h-1 rounded-full bg-gray-400 mr-3"></span>
                                                                    {it.name}
                                                                </span>
                                                                <span className="text-black font-bold">x{it.quantity}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                
                                                {/* Swipe Action */}
                                                <div className="pt-4 pb-1">
                                                    <SwipeButton onConfirm={() => markAsDelivered(item)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        {historyDeliveries.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                    <Clock className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-bold text-black">No History</h3>
                                <p className="text-gray-500 text-xs mt-1 font-medium">No completed deliveries on this date.</p>
                            </div>
                        ) : (
                            historyDeliveries.map(item => (
                                <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                                    <div 
                                        className="p-5 cursor-pointer hover:bg-orange-50/30 transition-colors"
                                        onClick={() => setExpandedOrderId(expandedOrderId === item.id ? null : item.id)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-black text-sm tracking-tight">Order #{generateNumericId(item.id)}</h3>
                                                <div className="flex gap-2 mt-1.5">
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                        {item.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="px-2 py-1 text-[9px] uppercase rounded font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center shadow-sm">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Delivered
                                                </span>
                                                {item.updatedAt && (
                                                    <div className="text-[10px] font-semibold text-gray-500 mt-1">
                                                        {new Date(item.updatedAt).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expandable Details */}
                                    {expandedOrderId === item.id && (
                                        <div className="px-5 pb-5 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                            <div className="text-xs space-y-3">
                                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                    <span className="text-gray-500 font-semibold uppercase tracking-wider">Customer</span>
                                                    <div className="text-right">
                                                        <div className="font-bold text-black">{item.customer?.name || 'Unknown'}</div>
                                                        {item.customer?.phone && (
                                                            <div className="text-gray-500 mt-0.5">{item.customer.phone}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <span className="text-gray-500 font-semibold uppercase tracking-wider block mb-2">Items</span>
                                                    <div className="font-medium text-black space-y-1">
                                                        {item.items?.map((it, i) => (
                                                            <div key={i} className="flex justify-between">
                                                                <span>{it.name}</span>
                                                                <span className="font-bold">x{it.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100/50"></div>
                            
                            <div className="w-24 h-24 rounded-full bg-white border border-gray-100 shadow-md mx-auto relative z-10 flex items-center justify-center mt-4">
                                <User className="w-10 h-10 text-amber-500" />
                            </div>
                            
                            <h2 className="text-xl font-bold text-gray-900 mt-5 tracking-tight">{userData?.name || 'Delivery Agent'}</h2>
                            <p className="text-gray-500 text-sm font-medium mb-8">{user?.email}</p>
                            
                            <div className="bg-white border border-gray-200 rounded-xl p-5 text-left space-y-5">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</p>
                                    <p className="font-semibold text-black text-sm mt-1">{userData?.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Role</p>
                                    <p className="font-semibold text-black text-sm mt-1 flex items-center">
                                        <Package className="w-4 h-4 mr-2" /> Fleet Agent
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={logout}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl py-4 font-bold text-sm hover:shadow-lg hover:shadow-amber-500/30 transition-all flex justify-center items-center active:scale-95"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out Securely
                        </button>
                    </div>
                )}

            </main>

            <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-3 pb-8 z-30">
                <div className="flex justify-around items-center max-w-md mx-auto">
                    <button 
                        onClick={() => setActiveTab('route')}
                        className={`flex flex-col items-center p-2 px-6 rounded-2xl transition-all duration-300 ${activeTab === 'route' ? 'text-amber-600 bg-orange-50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Route className={`w-5 h-5 mb-1 ${activeTab === 'route' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Route</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex flex-col items-center p-2 px-6 rounded-2xl transition-all duration-300 ${activeTab === 'history' ? 'text-amber-600 bg-orange-50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <History className={`w-5 h-5 mb-1 ${activeTab === 'history' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">History</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center p-2 px-6 rounded-2xl transition-all duration-300 ${activeTab === 'profile' ? 'text-amber-600 bg-orange-50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <User className={`w-5 h-5 mb-1 ${activeTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeliveryDashboard;
