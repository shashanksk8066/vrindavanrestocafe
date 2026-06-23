import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Search, ChefHat, Check, Utensils, Phone, User, CheckCircle2, Clock, Bell, Gift } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const AdminLiveOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, received, preparing, served
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const q = query(
            collection(db, 'dineInOrders'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders = [];
            snapshot.forEach(doc => {
                fetchedOrders.push({ id: doc.id, ...doc.data() });
            });
            setOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching live orders:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const orderRef = doc(db, 'dineInOrders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update status");
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesSearch = 
            (order.tableNumber && order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (order.customerPhone && order.customerPhone.includes(searchTerm)) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchesDate = true;
        if (dateFilter && order.createdAt) {
            const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
            matchesDate = orderDate === dateFilter;
        }
        
        return matchesStatus && matchesSearch && matchesDate;
    });

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                        <Utensils className="w-8 h-8 mr-3 text-amber-500" />
                        Live Orders (Dine-In)
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage active table orders in real-time</p>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search table, name, phone..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none w-full sm:w-64 transition-all"
                        />
                    </div>
                    
                    <input 
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                    />
                    
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                    >
                        <option value="all">All Orders</option>
                        <option value="received">Received (New)</option>
                        <option value="preparing">Preparing</option>
                        <option value="served">Served</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 group">
                        
                        {/* Header */}
                        <div className={`p-5 flex justify-between items-start border-b border-gray-50 ${
                            order.status === 'received' ? 'bg-amber-50/50' : 
                            order.status === 'preparing' ? 'bg-blue-50/50' : 
                            'bg-green-50/50'
                        }`}>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    Order #{generateNumericId(order.id)}
                                </div>
                                <div className="font-black text-2xl text-gray-900">
                                    Table {order.tableNumber}
                                </div>
                                {order.requiresTableService && (
                                    <div className="mt-2 flex items-center text-[11px] font-black text-white bg-red-500 px-2 py-1 rounded-md max-w-max uppercase tracking-widest shadow-sm">
                                        <Bell className="w-3.5 h-3.5 mr-1.5" /> Table Service
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    order.status === 'received' ? 'bg-amber-100 text-amber-700' :
                                    order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {order.status === 'received' && <Clock className="w-3 h-3 mr-1" />}
                                    {order.status === 'preparing' && <ChefHat className="w-3 h-3 mr-1" />}
                                    {order.status === 'served' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {order.status}
                                </span>
                            </div>
                        </div>
                        
                        {/* Body */}
                        <div className="p-5 flex-1 flex flex-col">
                            {/* Customer Info */}
                            <div className="flex items-center justify-between mb-5 bg-gray-50 p-3 rounded-xl">
                                <div className="flex items-center text-sm font-semibold text-gray-700">
                                    <User className="w-4 h-4 mr-2 text-gray-400" />
                                    {order.customerName}
                                </div>
                                <div className="flex items-center text-sm font-semibold text-gray-700">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    {order.customerPhone}
                                </div>
                            </div>
                            
                            {/* Items */}
                            <div className="flex-1 space-y-3 mb-6">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">Order Items</h4>
                                {order.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="font-semibold text-gray-900 flex items-center">
                                            <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${
                                                item.foodType === 'non-veg' ? 'bg-red-500' : 
                                                item.foodType === 'egg' ? 'bg-yellow-500' : 
                                                'bg-green-500'
                                            }`}></span>
                                            {item.name}
                                        </div>
                                        <div className="font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-xs">x{item.quantity}</div>
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
                            
                            <div className="pt-4 border-t border-gray-100 border-dashed flex justify-between items-center">
                                <div className="font-black text-xl text-amber-600">
                                    ₹{order.totalAmount}
                                </div>
                                <div className="text-xs font-bold text-gray-400">
                                    {new Date(order.createdAt).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}
                                </div>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
                            {order.status === 'received' ? (
                                <>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to start preparing this order?')) {
                                                handleStatusChange(order.id, 'preparing');
                                            }
                                        }}
                                        className="col-span-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center text-sm"
                                    >
                                        <ChefHat className="w-4 h-4 mr-2" />
                                        Start Preparing
                                    </button>
                                </>
                            ) : order.status === 'preparing' ? (
                                <>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to mark this order as served?')) {
                                                handleStatusChange(order.id, 'served');
                                            }
                                        }}
                                        className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center text-sm"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Mark as Served
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="col-span-2 text-center py-2.5 text-sm font-bold text-green-600 bg-green-50 rounded-xl border border-green-100">
                                        Order Completed
                                    </div>
                                </>
                            )}
                        </div>
                        
                    </div>
                ))}
            </div>
            
            {filteredOrders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed shadow-sm">
                    <Utensils className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-1">No Orders Found</h3>
                    <p className="text-gray-500 font-medium">There are no live table orders matching your criteria.</p>
                </div>
            )}
        </div>
    );
};

export default AdminLiveOrders;
