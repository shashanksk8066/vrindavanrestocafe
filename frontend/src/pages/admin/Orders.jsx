import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Package, MapPin, Phone, User, Clock, CheckCircle, ChevronDown, IndianRupee } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [addressesMap, setAddressesMap] = useState({});
    const [menuItemsMap, setMenuItemsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('instant'); // 'instant' or 'subscription'
    const [filterDate, setFilterDate] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Fetch users for mapping details
            const usersSnap = await getDocs(collection(db, 'users'));
            const uMap = {};
            usersSnap.forEach(u => {
                uMap[u.id] = u.data();
            });
            setUsersMap(uMap);

            const [addrSnap, menuSnap, mainSnap, instantSnap, bookingSnap] = await Promise.all([
                getDocs(collection(db, 'addresses')),
                getDocs(collection(db, 'subscriptionMenu')),
                getDocs(collection(db, 'mainMenu')),
                getDocs(collection(db, 'instantOrders')),
                getDocs(collection(db, 'subscriptionBookings'))
            ]);

            const aMap = {};
            addrSnap.forEach(a => {
                aMap[a.id] = a.data();
            });
            setAddressesMap(aMap);

            const mMap = {};
            menuSnap.forEach(m => {
                mMap[m.id] = m.data();
            });
            mainSnap.forEach(m => {
                mMap[m.id] = m.data();
            });
            setMenuItemsMap(mMap);
            
            const instantData = [];
            instantSnap.forEach(d => {
                const data = d.data();
                const time = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
                instantData.push({ 
                    id: d.id, 
                    ...data,
                    orderedForTime: time,
                    createdAtTime: time
                });
            });
            
            const bookingData = [];
            bookingSnap.forEach(d => {
                const data = d.data();
                bookingData.push({ 
                    id: d.id, 
                    ...data,
                    orderedForTime: data.date ? new Date(data.date).getTime() : (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()),
                    createdAtTime: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime()
                });
            });

            // Sort by latest
            setOrders(instantData.sort((a,b) => b.orderedForTime - a.orderedForTime));
            setBookings(bookingData.sort((a,b) => b.orderedForTime - a.orderedForTime));
        } catch (error) {
            console.error("Error fetching orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (collectionName, id, newStatus) => {
        try {
            await updateDoc(doc(db, collectionName, id), { status: newStatus });
            // Optimistically update UI
            if (collectionName === 'instantOrders') {
                setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
            } else {
                setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
            }
        } catch (error) {
            console.error("Error updating status", error);
        }
    };

    const getStatusStyles = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending': 
            case 'preparing': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'assigned': 
            case 'out for delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-gray-500 font-medium animate-pulse">Loading Orders Directory...</p>
            </div>
        );
    }

    const dataToRender = activeTab === 'instant' ? orders : bookings;

    const filteredData = dataToRender.filter(order => {
        if (!filterDate) return true;
        // Convert orderedForTime to local date strings in YYYY-MM-DD format for comparison
        const orderDateObj = new Date(order.orderedForTime);
        const orderDateStr = orderDateObj.getFullYear() + '-' + String(orderDateObj.getMonth() + 1).padStart(2, '0') + '-' + String(orderDateObj.getDate()).padStart(2, '0');
        return orderDateStr === filterDate;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Order Management</h1>
                    <p className="text-gray-500 mt-1 font-medium">Track and manage all deliveries in real-time.</p>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Filter by Date</label>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="date" 
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-700 font-medium transition-all"
                        />
                        {filterDate && (
                            <button 
                                onClick={() => setFilterDate('')}
                                className="px-4 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Tabs */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-2 inline-flex space-x-2">
                <button
                    onClick={() => setActiveTab('instant')}
                    className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === 'instant' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Package className={`h-5 w-5 mr-2 ${activeTab === 'instant' ? 'text-white' : 'text-gray-400'}`} />
                    Instant Orders
                </button>
                <button
                    onClick={() => setActiveTab('subscription')}
                    className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 ${activeTab === 'subscription' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Clock className={`h-5 w-5 mr-2 ${activeTab === 'subscription' ? 'text-white' : 'text-gray-400'}`} />
                    Subscription Bookings
                </button>
            </div>

            {/* Orders Feed */}
            {filteredData.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
                    <p className="text-gray-500 mt-2">
                        {filterDate ? `There are no ${activeTab === 'instant' ? 'instant orders' : 'subscription bookings'} for the selected date.` : `There are currently no ${activeTab === 'instant' ? 'instant orders' : 'subscription bookings'} available.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredData.map((order) => {
                        const user = usersMap[order.userId] || {};
                        const address = addressesMap[order.addressId];
                        const dateObj = new Date(order.createdAtTime);

                        let addOnTotalUI = 0;
                        if (order.addOnItems && Array.isArray(order.addOnItems)) {
                            order.addOnItems.forEach(i => {
                                const qty = typeof i === 'string' ? 1 : (i.quantity || 1);
                                const price = i.price || (typeof i !== 'string' && menuItemsMap[i.id]?.price) || 0;
                                addOnTotalUI += (qty * price);
                            });
                        }
                        const displayAmount = order.totalAmount || order.amount || addOnTotalUI;
                        
                        return (
                            <div key={order.id} className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-col lg:flex-row gap-6 justify-between">
                                        
                                        {/* Left Col: Order Meta & User Info */}
                                        <div className="flex-1 space-y-6">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">#{generateNumericId(order.id)}</h3>
                                                <span className={`px-3 py-1 text-sm font-bold rounded-full border ${getStatusStyles(order.status)} uppercase tracking-wider`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                                <span className="text-sm font-semibold flex flex-col justify-center bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                                    <div className="flex items-center text-gray-800">
                                                        <Clock className="h-4 w-4 mr-1.5 text-amber-500" />
                                                        {activeTab === 'subscription' ? 'Ordered For: ' : ''} {new Date(order.orderedForTime).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 ml-5">
                                                        Ordered at: {new Date(order.createdAtTime).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})} {new Date(order.createdAtTime).toLocaleDateString()}
                                                    </div>
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Customer Details */}
                                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Details</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center text-gray-800 font-semibold">
                                                            <User className="h-4 w-4 mr-2 text-amber-500" />
                                                            {user.name || 'Unknown User'}
                                                        </div>
                                                        <div className="flex items-center text-gray-600 text-sm">
                                                            <Phone className="h-4 w-4 mr-2 text-amber-500" />
                                                            {user.phone || 'No phone provided'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Location Details (if any) or Billing */}
                                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Billing & Location</h4>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center text-green-600 font-bold text-lg">
                                                            {activeTab === 'subscription' && displayAmount === 0 ? (
                                                                <span className="text-blue-600 flex items-center text-sm font-black tracking-wide uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                                    <CheckCircle className="h-4 w-4 mr-1.5" />
                                                                    Pre-paid Plan
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <IndianRupee className="h-5 w-5 mr-1" />
                                                                    {displayAmount}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-start text-gray-600 text-sm leading-snug">
                                                            <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                                            <span>
                                                                {address ? (
                                                                    <><strong>{address.label}:</strong> {address.flatNumber}, {address.streetArea} {address.landmark ? `(Near ${address.landmark})` : ''}</>
                                                                ) : (
                                                                    <>Address stored securely in system. User ID: <span className="font-mono text-xs">{generateNumericId(order.userId)}</span></>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Col: Items & Action */}
                                        <div className="flex-1 lg:max-w-md flex flex-col justify-between space-y-6">
                                            {/* Items List */}
                                            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex-1">
                                                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">Order Items</h4>
                                                
                                                {activeTab === 'instant' && order.items && order.items.length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {order.items.map((item, idx) => (
                                                            <li key={idx} className="flex justify-between items-start text-sm">
                                                                <span className="font-semibold text-gray-800">
                                                                    <span className="text-amber-600 mr-2">{item.quantity}x</span>
                                                                    {item.name}
                                                                </span>
                                                                <span className="font-bold text-gray-600">₹{item.price * item.quantity}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : activeTab === 'subscription' && (order.menuItems?.length > 0 || order.addOnItems?.length > 0) ? (
                                                    <ul className="space-y-3">
                                                        {order.menuItems && order.menuItems.map((item, idx) => {
                                                            const itemId = typeof item === 'string' ? item : item.id;
                                                            const qty = typeof item === 'string' ? 1 : (item.quantity || 1);
                                                            const name = menuItemsMap[itemId]?.name || 'Meal Item';
                                                            return (
                                                                <li key={`menu-${idx}`} className="flex justify-between items-start text-sm">
                                                                    <span className="font-semibold text-gray-800">
                                                                        <span className="text-amber-600 mr-2">{qty}x</span>
                                                                        {name}
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                        {order.addOnItems && order.addOnItems.map((item, idx) => {
                                                            const itemId = typeof item === 'string' ? item : item.id;
                                                            const qty = typeof item === 'string' ? 1 : (item.quantity || 1);
                                                            const name = item.name || menuItemsMap[itemId]?.name || 'Add-on Item';
                                                            return (
                                                                <li key={`addon-${idx}`} className="flex justify-between items-start text-sm">
                                                                    <span className="font-semibold text-gray-800">
                                                                        <span className="text-amber-600 mr-2">{qty}x</span>
                                                                        {name} <span className="text-xs font-bold text-amber-500 ml-1">(Add-on)</span>
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : (
                                                    <div className="text-sm text-gray-500 italic">No specific items listed.</div>
                                                )}
                                            </div>

                                            {/* Action Dropdown */}
                                            <div className="relative">
                                                <select
                                                    value={order.status || 'pending'}
                                                    onChange={(e) => updateStatus(activeTab === 'instant' ? 'instantOrders' : 'subscriptionBookings', order.id, e.target.value)}
                                                    className="w-full appearance-none bg-black text-white font-bold py-3.5 pl-6 pr-10 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/30 cursor-pointer shadow-md hover:bg-gray-900 transition-colors"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="preparing">Preparing</option>
                                                    <option value="assigned">Assigned</option>
                                                    <option value="out for delivery">Out for Delivery</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                                                    <ChevronDown className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Orders;
