import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CreditCard, ShoppingBag, Truck, TrendingUp, IndianRupee, Activity, Clock, CheckCircle, Package, Zap, X, ChevronRight } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { generateNumericId } from '../../utils/formatId';

const DashboardCard = ({ title, value, subTitle, icon: Icon, colorClass, onClick, interactive }) => (
    <div 
        onClick={onClick}
        className={`bg-white/95 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group transition-all duration-300 ${interactive ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}`}
    >
        <div className="flex items-center justify-between mb-4 relative z-10">
            <div className={`p-3.5 rounded-xl ${colorClass} bg-opacity-10 text-${colorClass.split('-')[1]}-600 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`h-6 w-6`} />
            </div>
            {interactive && (
                <div className="text-gray-400 group-hover:text-amber-500 transition-colors">
                    <ChevronRight className="h-5 w-5" />
                </div>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
            <p className="text-sm font-semibold text-gray-700 mt-1">{title}</p>
            {subTitle && (
                <p className="text-xs font-medium text-gray-500 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md border border-gray-100">{subTitle}</p>
            )}
        </div>
        <div className={`absolute -right-6 -bottom-6 opacity-5 ${colorClass} rounded-full p-8 group-hover:scale-150 transition-transform duration-700 pointer-events-none`}>
            <Icon className="h-24 w-24" />
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: 0,
        subscriptionsCount: 0,
        subRevenue: 0,
        todayOrders: 0,
        overallOrders: 0,
        todayRevenue: 0,
        overallRevenue: 0,
        pending: 0,
        delivered: 0
    });
    
    const [recentOrders, setRecentOrders] = useState([]);
    const [subscriptionDetails, setSubscriptionDetails] = useState([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [subModalTab, setSubModalTab] = useState('active'); // 'active' or 'inactive'
    const [loading, setLoading] = useState(true);
    const [instantEnabled, setInstantEnabled] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all necessary collections
                const [usersSnap, subsSnap, instantSnap, bookingsSnap, plansSnap, settingsSnap] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'subscriptions')),
                    getDocs(collection(db, 'instantOrders')),
                    getDocs(collection(db, 'subscriptionBookings')),
                    getDocs(collection(db, 'subscriptionPlans')),
                    getDoc(doc(db, 'appSettings', 'global'))
                ]);
                
                if (settingsSnap.exists()) {
                    setInstantEnabled(settingsSnap.data().instantOrdersEnabled ?? true);
                }
                
                // Map Users for quick lookup
                const usersMap = {};
                usersSnap.forEach(doc => {
                    usersMap[doc.id] = doc.data();
                });

                // Map Plans for price and meal counts
                const plansMap = {};
                plansSnap.forEach(doc => {
                    plansMap[doc.id] = doc.data();
                });

                // Calculate Dates
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

                // 1. Instant Orders Analytics
                let todayRev = 0;
                let overallRev = 0;
                let todayOrd = 0;
                let overallOrd = 0;
                let pendingCount = 0;
                let deliveredCount = 0;
                
                let allRecent = [];

                instantSnap.forEach(doc => {
                    const data = doc.data();
                    const createdAtTime = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
                    
                    const amount = Number(data.totalAmount) || 0;
                    overallRev += amount;
                    overallOrd++;

                    if (createdAtTime >= startOfToday && createdAtTime < endOfToday) {
                        todayRev += amount;
                        todayOrd++;
                        
                        if (data.status === 'pending' || data.status === 'preparing') pendingCount++;
                        if (data.status === 'delivered') deliveredCount++;
                    }

                    allRecent.push({
                        id: doc.id,
                        type: 'Instant',
                        ...data,
                        createdAtTime: createdAtTime || 0
                    });
                });

                // 2. Subscription Bookings (for recent feed and fulfillment stats)
                bookingsSnap.forEach(doc => {
                    const data = doc.data();
                    const createdAtTime = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
                    const orderedForTime = data.date ? new Date(data.date).getTime() : createdAtTime;
                    
                    if (orderedForTime >= startOfToday && orderedForTime < endOfToday) {
                        if (data.status === 'pending' || data.status === 'assigned') pendingCount++;
                        if (data.status === 'delivered') deliveredCount++;
                    }

                    allRecent.push({
                        id: doc.id,
                        type: 'Subscription',
                        ...data,
                        createdAtTime: createdAtTime || 0
                    });
                });

                // Sort and get top 5 recent orders
                allRecent.sort((a, b) => b.createdAtTime - a.createdAtTime);
                const top5Recent = allRecent.slice(0, 5);

                // 3. Subscriptions Analytics
                let subTotalRev = 0;
                let subCount = 0;
                const subsDetailed = [];

                subsSnap.forEach(doc => {
                    const data = doc.data();
                    const planDetails = plansMap[data.planId] || {};
                    subCount++;
                    
                    const amount = Number(data.amountPaid) || Number(data.totalAmount) || Number(data.price) || Number(planDetails.price) || 0;
                    subTotalRev += amount;
                    
                    const totalMeals = data.totalMeals || data.mealCount || planDetails.mealCount || 0;
                    const remainingMeals = data.remainingMeals !== undefined ? data.remainingMeals : totalMeals;
                    const usedMeals = data.usedMeals !== undefined ? data.usedMeals : (totalMeals - remainingMeals);
                    
                    const currentStatus = usedMeals >= totalMeals ? 'completed' : (data.status || 'active');

                    const user = usersMap[data.userId] || {};
                    subsDetailed.push({
                        id: doc.id,
                        planName: data.planName || planDetails.name || 'Custom Plan',
                        amount: amount,
                        userName: user.name || 'Unknown',
                        userPhone: user.phone || 'N/A',
                        status: currentStatus,
                        totalMeals,
                        usedMeals,
                        startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate)
                    });
                });

                // Update States
                setStats({
                    users: usersSnap.size,
                    subscriptionsCount: subCount,
                    subRevenue: subTotalRev,
                    todayOrders: todayOrd,
                    overallOrders: overallOrd,
                    todayRevenue: todayRev,
                    overallRevenue: overallRev,
                    pending: pendingCount,
                    delivered: deliveredCount
                });
                
                setRecentOrders(top5Recent);
                setSubscriptionDetails(subsDetailed.sort((a, b) => b.startDate - a.startDate));

            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const toggleInstantOrders = async () => {
        const newState = !instantEnabled;
        const confirmMessage = newState 
            ? "Are you sure you want to TURN ON Instant Orders?\nCustomers will be able to place orders again."
            : "Are you sure you want to TURN OFF Instant Orders?\nThis will close the store and block customers from placing orders.";
            
        if (!window.confirm(confirmMessage)) return;

        setInstantEnabled(newState); // optimistic update
        try {
            const settingsRef = doc(db, 'appSettings', 'global');
            const snap = await getDoc(settingsRef);
            if (snap.exists()) {
                await updateDoc(settingsRef, { instantOrdersEnabled: newState });
            } else {
                await setDoc(settingsRef, { instantOrdersEnabled: newState });
            }
        } catch (error) {
            console.error("Error toggling instant orders", error);
            setInstantEnabled(!newState); // revert on failure
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-32">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-gray-500 font-medium animate-pulse">Computing Live Analytics...</p>
            </div>
        );
    }

    const orderTotal = stats.pending + stats.delivered || 1;
    const pendingPerc = Math.round((stats.pending / orderTotal) * 100);
    const deliveredPerc = Math.round((stats.delivered / orderTotal) * 100);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Overview</h1>
                    <p className="text-gray-500 mt-1 font-medium">Here's what's happening at Vrindavan Resto Cafe today.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-gray-700 text-sm">Instant Orders</span>
                        <button 
                            onClick={toggleInstantOrders}
                            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${instantEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${instantEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                    </div>

                    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hidden sm:flex">
                        <Activity className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold text-gray-700 text-sm">Live</span>
                        <span className="relative flex h-3 w-3 ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard 
                    title="Today's Revenue" 
                    value={`₹${stats.todayRevenue.toLocaleString()}`} 
                    subTitle={`Overall: ₹${stats.overallRevenue.toLocaleString()}`}
                    icon={IndianRupee} 
                    colorClass="bg-amber-500" 
                />
                <DashboardCard 
                    title="Today's Orders" 
                    value={stats.todayOrders} 
                    subTitle={`Overall Total: ${stats.overallOrders}`}
                    icon={ShoppingBag} 
                    colorClass="bg-orange-500" 
                />
                <DashboardCard 
                    title="Active Subscriptions" 
                    value={stats.subscriptionsCount} 
                    subTitle={`Total Sub Revenue: ₹${stats.subRevenue.toLocaleString()}`}
                    icon={CreditCard} 
                    colorClass="bg-green-500" 
                    interactive={true}
                    onClick={() => setIsSubModalOpen(true)}
                />
                <DashboardCard 
                    title="Registered Users" 
                    value={stats.users} 
                    icon={Users} 
                    colorClass="bg-blue-500" 
                />
            </div>
            
            {/* Split Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                
                {/* Left: Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-sm p-6 lg:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Recent Orders (All Types)</h2>
                        <button onClick={() => navigate('/admin/orders')} className="text-amber-600 text-sm font-semibold hover:text-amber-700 transition-colors">
                            View All →
                        </button>
                    </div>
                    
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No recent orders found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentOrders.map(order => (
                                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                                    <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${order.type === 'Instant' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                            {order.type === 'Instant' ? <ShoppingBag className="h-6 w-6 text-amber-600" /> : <CreditCard className="h-6 w-6 text-blue-600" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <p className="font-bold text-gray-900">Order #{generateNumericId(order.id)}</p>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${order.type === 'Instant' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                                    {order.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">
                                                {order.type === 'Instant' ? `₹${order.totalAmount} • ${order.items?.length || 0} items` : `Plan Booking`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                              'bg-amber-100 text-amber-800'}`}
                                        >
                                            {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-2 font-medium">
                                            {new Date(order.createdAtTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Analytics Metrics */}
                <div className="space-y-6">
                    {/* Order Fulfillment Status */}
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-sm p-6 lg:p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Fulfillment Analytics</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center text-gray-700 font-semibold text-sm">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        Delivered
                                    </div>
                                    <div className="flex items-baseline space-x-2">
                                        <span className="font-extrabold text-gray-900">{stats.delivered}</span>
                                        <span className="text-xs text-gray-500 font-medium">({deliveredPerc}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${deliveredPerc}%` }}></div>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center text-gray-700 font-semibold text-sm">
                                        <Clock className="h-4 w-4 mr-2 text-amber-500" />
                                        Pending / Preparing
                                    </div>
                                    <div className="flex items-baseline space-x-2">
                                        <span className="font-extrabold text-gray-900">{stats.pending}</span>
                                        <span className="text-xs text-gray-500 font-medium">({pendingPerc}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${pendingPerc}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Subscriptions Modal */}
            {isSubModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>
                        
                        <div className="px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/50 mt-1 gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Subscriptions Directory</h2>
                                <p className="text-gray-500 text-sm mt-1">Manage all user meal plan enrollments</p>
                            </div>
                            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
                                <button 
                                    onClick={() => setSubModalTab('active')}
                                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${subModalTab === 'active' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Active Plans
                                </button>
                                <button 
                                    onClick={() => setSubModalTab('inactive')}
                                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${subModalTab === 'inactive' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    Completed / Inactive
                                </button>
                            </div>
                            <button onClick={() => setIsSubModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8">
                            {(() => {
                                const filteredSubs = subscriptionDetails.filter(sub => 
                                    subModalTab === 'active' 
                                        ? (sub.status !== 'completed' && sub.status !== 'cancelled' && sub.status !== 'inactive') 
                                        : (sub.status === 'completed' || sub.status === 'cancelled' || sub.status === 'inactive')
                                );
                                
                                if (filteredSubs.length === 0) {
                                    return (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 font-medium">No {subModalTab} subscriptions found.</p>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredSubs.map((sub) => (
                                            <div key={sub.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-amber-200 transition-all bg-white group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-amber-600 transition-colors">{sub.userName}</h3>
                                                        <p className="text-gray-500 text-sm mt-0.5">{sub.userPhone}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${sub.status === 'completed' || sub.status === 'cancelled' || sub.status === 'inactive' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                                        {sub.status === 'completed' ? 'Completed' : sub.status === 'cancelled' ? 'Cancelled' : sub.status === 'inactive' ? 'Inactive' : 'Active'}
                                                    </span>
                                                </div>
                                            
                                            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center mt-2">
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Plan</p>
                                                    <p className="font-semibold text-gray-900">{sub.planName}</p>
                                                </div>
                                                <div className="text-center border-l border-r border-gray-200 px-4">
                                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Meals Used</p>
                                                    <p className="font-bold text-gray-900">
                                                        <span className="text-orange-600 text-lg">{sub.usedMeals}</span> <span className="text-gray-400">/ {sub.totalMeals}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Revenue</p>
                                                    <p className="font-bold text-green-600 text-lg">₹{sub.amount}</p>
                                                </div>
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
                            <button 
                                onClick={() => setIsSubModalOpen(false)}
                                className="px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-black transition-colors"
                            >
                                Close Directory
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
