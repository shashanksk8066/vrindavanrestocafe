import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Gift } from 'lucide-react';

const FreeFoods = () => {
    const [freeFoods, setFreeFoods] = useState([]);
    const [mainMenu, setMainMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        itemId: '',
        name: '',
        imageUrl: '',
        minOrderAmount: 0,
        status: 'active'
    });
    const [editingId, setEditingId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch main menu items for selection
            const menuSnap = await getDocs(query(collection(db, 'mainMenu'), where('status', '==', 'active')));
            const menuData = [];
            menuSnap.forEach(doc => menuData.push({ id: doc.id, ...doc.data() }));
            setMainMenu(menuData);

            // Fetch free foods
            const ffSnap = await getDocs(collection(db, 'freeFoods'));
            const ffData = [];
            ffSnap.forEach(doc => ffData.push({ id: doc.id, ...doc.data() }));
            setFreeFoods(ffData);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMenuItemChange = (e) => {
        const selectedId = e.target.value;
        const selectedItem = mainMenu.find(m => m.id === selectedId);
        if (selectedItem) {
            setFormData({
                ...formData,
                itemId: selectedItem.id,
                name: selectedItem.name,
                imageUrl: selectedItem.imageUrl || selectedItem.image || ''
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.itemId) {
                alert("Please select a menu item.");
                return;
            }

            const dataToSave = {
                ...formData
            };

            if (editingId) {
                await updateDoc(doc(db, 'freeFoods', editingId), {
                    ...dataToSave,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'freeFoods'), {
                    ...dataToSave,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving free food", error);
            alert("Error saving free food: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this free food promotion?")) {
            try {
                await deleteDoc(doc(db, 'freeFoods', id));
                fetchData();
            } catch (error) {
                console.error("Error deleting free food", error);
            }
        }
    };

    const openEdit = (item) => {
        setFormData({
            itemId: item.itemId,
            name: item.name,
            imageUrl: item.imageUrl || '',
            minOrderAmount: item.minOrderAmount,
            status: item.status
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-4">Loading free foods...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Free Foods Promotions</h1>
                    <p className="text-gray-500 mt-1">Manage free items unlocked by order limits</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ itemId: '', name: '', imageUrl: '', minOrderAmount: 0, status: 'active' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="h-5 w-5 mr-2" /> Add Free Food
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeFoods.map((item) => (
                    <div key={item.id} className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
                        
                        <div className="p-6 relative z-10 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Gift className="w-6 h-6 text-orange-500" />
                                        )}
                                    </div>
                                    <span className="font-bold text-lg text-gray-900">{item.name}</span>
                                </div>
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
                                    item.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                    {item.status}
                                </span>
                            </div>

                            <div className="mb-2 bg-orange-50 rounded-xl p-4 border border-orange-100">
                                <p className="text-sm text-gray-500 mb-1">Unlocks on orders above</p>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-black text-gray-900 tracking-tight">₹{item.minOrderAmount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex space-x-3">
                            <button 
                                onClick={() => openEdit(item)} 
                                className="flex-1 flex items-center justify-center bg-white border-2 border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:border-black hover:text-black transition-colors"
                            >
                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id)} 
                                className="flex items-center justify-center bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors border-2 border-red-100 hover:border-red-200"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {freeFoods.length === 0 && (
                <div className="py-24 bg-white rounded-3xl border border-gray-100 text-center shadow-sm mt-6">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Gift className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Free Foods Found</h3>
                    <p className="text-gray-500 mt-2">Create your first free food promotion to boost sales!</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Free Food' : 'Create New Free Food'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-full shadow-sm border border-gray-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Select Main Menu Item</label>
                                <select 
                                    required 
                                    value={formData.itemId} 
                                    onChange={handleMenuItemChange} 
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-semibold appearance-none"
                                >
                                    <option value="" disabled>Select an item...</option>
                                    {mainMenu.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Min. Order Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0" 
                                        value={formData.minOrderAmount} 
                                        onChange={e => setFormData({...formData, minOrderAmount: e.target.value ? parseFloat(e.target.value) : 0})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-bold text-lg" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Status</label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({...formData, status: e.target.value})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-semibold appearance-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg rounded-xl transition-all shadow-md">
                                    {editingId ? 'Save Changes' : 'Create Promotion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FreeFoods;
