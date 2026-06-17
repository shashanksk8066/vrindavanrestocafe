import { useState, useEffect, useCallback } from 'react';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Package, Phone, Mail, X, Loader2, MapPin } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const Deliveries = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeOrdersMap, setActiveOrdersMap] = useState({});
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [agentLoad, setAgentLoad] = useState([]);
    const [loadingLoad, setLoadingLoad] = useState(false);
    const [loadDate, setLoadDate] = useState(new Date().toISOString().split('T')[0]);

    // Create Agent Form State
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const agentsQ = query(collection(db, 'users'), where('role', '==', 'delivery'));
            const agentsSnap = await getDocs(agentsQ);
            const agentsList = [];
            agentsSnap.forEach(d => agentsList.push({ id: d.id, ...d.data() }));

            const instantSnap = await getDocs(query(collection(db, 'instantOrders'), where('status', '==', 'assigned')));
            const bookingSnap = await getDocs(query(collection(db, 'subscriptionBookings'), where('status', '==', 'assigned')));
            
            const countsMap = {};
            const processSnap = (snap) => {
                snap.forEach(d => {
                    const boyId = d.data().deliveryBoyId;
                    if (boyId) countsMap[boyId] = (countsMap[boyId] || 0) + 1;
                });
            };

            processSnap(instantSnap);
            processSnap(bookingSnap);

            setAgents(agentsList);
            setActiveOrdersMap(countsMap);
        } catch (error) {
            console.error("Error fetching agents:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            setCreateError("Name, Email, and Password are required.");
            return;
        }

        setCreating(true);
        setCreateError('');

        try {
            const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: formData.email,
                name: formData.name,
                phone: formData.phone || '',
                role: 'delivery',
                createdAt: new Date().toISOString()
            });

            await secondaryAuth.signOut();
            
            setIsCreateModalOpen(false);
            setFormData({ name: '', email: '', phone: '', password: '' });
            fetchData();
            alert("Delivery agent created successfully!");
        } catch (error) {
            console.error("Create agent error:", error);
            setCreateError(error.message || "Failed to create agent.");
        } finally {
            setCreating(false);
        }
    };

    const fetchAgentLoad = useCallback(async (agent, dateStr) => {
        setLoadingLoad(true);
        setAgentLoad([]);
        try {
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);
            
            const [instantSnap, bookingSnap] = await Promise.all([
                getDocs(query(collection(db, 'instantOrders'), where('deliveryBoyId', '==', agent.id))),
                getDocs(query(collection(db, 'subscriptionBookings'), where('deliveryBoyId', '==', agent.id)))
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
                const dDate = new Date(data.createdAt || data.updatedAt);
                if (dDate >= startOfDay && dDate <= endOfDay) {
                    await resolveUserAndAddress(data);
                    loadItems.push({ id: d.id, type: 'Instant', ...data });
                }
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
                let bDate = new Date(data.date);
                if (isNaN(bDate)) bDate = new Date(data.createdAt);
                
                if (bDate >= startOfDay && bDate <= endOfDay) {
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
                    loadItems.push({ id: d.id, type: 'Subscription', ...data });
                }
            }

            const fullyResolved = loadItems.map(item => ({
                ...item,
                customer: usersCache[item.userId] || {},
                address: addressCache[item.addressId] || {}
            }));
            
            // Sort by status ('assigned' first, then 'delivered')
            fullyResolved.sort((a,b) => {
                if (a.status === 'assigned' && b.status !== 'assigned') return -1;
                if (a.status !== 'assigned' && b.status === 'assigned') return 1;
                return 0;
            });

            setAgentLoad(fullyResolved);
        } catch (error) {
            console.error("Error fetching load:", error);
        } finally {
            setLoadingLoad(false);
        }
    }, []);

    const handleViewLoad = (agent) => {
        setSelectedAgent(agent);
        setIsLoadModalOpen(true);
        fetchAgentLoad(agent, loadDate);
    };
    
    useEffect(() => {
        if (isLoadModalOpen && selectedAgent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchAgentLoad(selectedAgent, loadDate);
        }
    }, [loadDate, isLoadModalOpen, selectedAgent, fetchAgentLoad]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Delivery Fleet</h1>
                    <p className="text-gray-500 mt-1">Manage delivery agents and monitor active loads</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add Agent
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agents.map(agent => (
                    <div key={agent.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-md">
                                {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 flex items-center border border-amber-100 shadow-sm">
                                <Package className="w-3.5 h-3.5 mr-1" />
                                {activeOrdersMap[agent.id] || 0} Active
                            </div>
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 truncate mb-4">{agent.name || 'Unnamed Agent'}</h3>
                        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                            <div className="flex items-center text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm shrink-0">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="truncate font-medium">{agent.email}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm shrink-0">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="font-medium">{agent.phone || 'No phone'}</span>
                            </div>
                        </div>
                        <div className="mt-auto pt-2 border-t border-gray-100">
                            <button 
                                onClick={() => handleViewLoad(agent)}
                                className="w-full flex items-center justify-center py-2.5 text-sm font-bold text-amber-600 hover:text-white hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 rounded-xl transition-all"
                            >
                                View Active Load
                            </button>
                        </div>
                    </div>
                ))}
                
                {agents.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 border-dashed">
                        No delivery agents found. Add one to get started.
                    </div>
                )}
            </div>

            {/* Create Agent Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">New Delivery Agent</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
                            {createError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {createError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Full Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Email</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Temporary Password</label>
                                <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors" />
                            </div>
                            <div className="pt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all">
                                    {creating ? 'Creating...' : 'Create Agent'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Active Load Modal */}
            {isLoadModalOpen && selectedAgent && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
                    <div className="bg-gray-50 w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="p-6 bg-white border-b border-gray-100 flex flex-col space-y-4 shadow-sm z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedAgent.name}'s Load</h2>
                                    <p className="text-sm text-gray-500 mt-1">Assigned and Delivered Orders</p>
                                </div>
                                <button onClick={() => setIsLoadModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-600">Filter Date:</span>
                                <input 
                                    type="date" 
                                    value={loadDate}
                                    onChange={(e) => setLoadDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-black"
                                />
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {loadingLoad ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : agentLoad.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No orders found for this agent on the selected date.
                                </div>
                            ) : (
                                agentLoad.map(order => (
                                    <div key={order.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative">
                                        <div className="absolute top-6 right-6 flex flex-col items-end space-y-2">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
                                                order.type === 'Instant' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                                            }`}>
                                                {order.type}
                                            </span>
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
                                                order.status === 'delivered' || order.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase mb-2">Order #{generateNumericId(order.id)}</div>
                                        {order.status === 'delivered' && order.updatedAt && (
                                            <div className="text-xs text-green-600 font-bold mb-3 flex items-center bg-green-50 w-max px-2 py-1 rounded-md">
                                                Delivered at: {new Date(order.updatedAt).toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', hour12: true})}
                                            </div>
                                        )}
                                        <div className="font-bold text-gray-900 text-xl mb-4">{order.customer?.name || 'Unknown'}</div>
                                        
                                        <div className="space-y-2 mb-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="text-sm text-gray-600 flex items-center">
                                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <span className="font-medium">{order.customer?.phone || 'No Phone'}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 flex items-start">
                                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm shrink-0">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <span className="mt-1 font-medium">{order.address?.fullAddress || 'No Address Provided'}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Order Items</div>
                                            <ul className="space-y-2">
                                                {order.items?.map((item, i) => (
                                                    <li key={i} className="text-sm flex justify-between items-center">
                                                        <span className="font-medium text-gray-800 flex items-center">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2"></span>
                                                            {item.name}
                                                        </span>
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-xs">x{item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deliveries;
