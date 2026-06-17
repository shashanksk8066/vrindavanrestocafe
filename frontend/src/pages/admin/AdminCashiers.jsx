import { useState, useEffect, useCallback } from 'react';
import { db, firebaseConfig } from '../../config/firebase';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Wallet, Phone, Mail, X, Loader2, Trash2 } from 'lucide-react';

const AdminCashiers = () => {
    const [cashiers, setCashiers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Agent Form State
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const cashiersQ = query(collection(db, 'users'), where('role', '==', 'cashier'));
            const cashiersSnap = await getDocs(cashiersQ);
            const cashiersList = [];
            cashiersSnap.forEach(d => cashiersList.push({ id: d.id, ...d.data() }));

            setCashiers(cashiersList);
        } catch (error) {
            console.error("Error fetching cashiers:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateCashier = async (e) => {
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
                role: 'cashier',
                createdAt: new Date().toISOString()
            });

            await secondaryAuth.signOut();
            
            setIsCreateModalOpen(false);
            setFormData({ name: '', email: '', phone: '', password: '' });
            fetchData();
            alert("Cashier account created successfully!");
        } catch (error) {
            console.error("Create cashier error:", error);
            setCreateError(error.message || "Failed to create cashier account.");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this cashier? They will no longer be able to log in.")) return;
        
        try {
            await deleteDoc(doc(db, 'users', id));
            fetchData();
        } catch (error) {
            console.error("Error deleting cashier", error);
            alert("Failed to delete cashier data.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                        <Wallet className="w-8 h-8 mr-3 text-amber-500" />
                        Cashiers
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Manage restaurant cashiers for live orders</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 md:mt-0 bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center shadow-sm"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Cashier
                </button>
            </div>

            {/* Cashiers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cashiers.map(cashier => (
                    <div key={cashier.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                                        <Wallet className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{cashier.name}</h3>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                                            Cashier
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(cashier.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl">
                                <div className="flex items-center text-sm font-semibold text-gray-700">
                                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                                    {cashier.phone || 'No phone'}
                                </div>
                                <div className="flex items-center text-sm font-semibold text-gray-700">
                                    <Mail className="w-4 h-4 mr-3 text-gray-400" />
                                    {cashier.email}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {cashiers.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed shadow-sm">
                    <Wallet className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-1">No Cashiers</h3>
                    <p className="text-gray-500 font-medium">Add a cashier to allow them to manage live table orders.</p>
                </div>
            )}

            {/* Create Cashier Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <UserPlus className="w-5 h-5 mr-2 text-amber-500" />
                                Create Cashier Account
                            </h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-colors shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreateCashier} className="space-y-4">
                                {createError && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                                        {createError}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                        placeholder="Cashier Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                        placeholder="Phone Number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                        placeholder="cashier@vrindavan.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center mt-2 shadow-md shadow-amber-500/20"
                                >
                                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCashiers;
