import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Ticket } from 'lucide-react';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        type: 'flat', // flat or percentage
        discount: 0,
        minOrderAmount: 0,
        usageLimit: '', // empty means unlimited
        status: 'active'
    });
    const [editingId, setEditingId] = useState(null);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'coupons'));
            const couponsData = [];
            snapshot.forEach(doc => couponsData.push({ id: doc.id, ...doc.data() }));
            setCoupons(couponsData);
        } catch (error) {
            console.error("Error fetching coupons", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                code: formData.code.toUpperCase().trim()
            };

            if (editingId) {
                await updateDoc(doc(db, 'coupons', editingId), {
                    ...dataToSave,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'coupons'), {
                    ...dataToSave,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchCoupons();
        } catch (error) {
            console.error("Error saving coupon", error);
            alert("Error saving coupon: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this coupon?")) {
            try {
                await deleteDoc(doc(db, 'coupons', id));
                fetchCoupons();
            } catch (error) {
                console.error("Error deleting coupon", error);
            }
        }
    };

    const openEdit = (coupon) => {
        setFormData({
            code: coupon.code,
            type: coupon.type,
            discount: coupon.discount,
            minOrderAmount: coupon.minOrderAmount,
            usageLimit: coupon.usageLimit || '',
            status: coupon.status
        });
        setEditingId(coupon.id);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-4">Loading coupons...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Discount Coupons</h1>
                    <p className="text-gray-500 mt-1">Manage promotional codes and discounts</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ code: '', type: 'flat', discount: 0, minOrderAmount: 0, usageLimit: '', status: 'active' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                >
                    <Plus className="h-5 w-5 mr-2" /> Add Coupon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:border-amber-200 transition-all duration-300 relative overflow-hidden group flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
                        
                        <div className="p-6 relative z-10 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl border border-orange-200/50 shadow-sm">
                                    <Ticket className="w-5 h-5 text-orange-500 mr-2 rotate-45" />
                                    <span className="font-mono font-black text-lg tracking-widest text-orange-700">{coupon.code}</span>
                                </div>
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
                                    coupon.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                    {coupon.status}
                                </span>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline mb-1">
                                    <span className="text-3xl font-black text-gray-900 tracking-tight">
                                        {coupon.type === 'flat' ? `₹${coupon.discount}` : `${coupon.discount}%`}
                                    </span>
                                    <span className="text-sm font-bold text-gray-400 ml-2 uppercase">OFF</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Valid on orders above <span className="font-bold text-gray-700">₹{coupon.minOrderAmount}</span>
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Usage Limit</span>
                                <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                                    {coupon.usageLimit ? `${coupon.usageLimit} remaining` : 'Unlimited'}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex space-x-3">
                            <button 
                                onClick={() => openEdit(coupon)} 
                                className="flex-1 flex items-center justify-center bg-white border-2 border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:border-black hover:text-black transition-colors"
                            >
                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(coupon.id)} 
                                className="flex items-center justify-center bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors border-2 border-red-100 hover:border-red-200"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {coupons.length === 0 && (
                <div className="py-24 bg-white rounded-3xl border border-gray-100 text-center shadow-sm mt-6">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Ticket className="h-8 w-8 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Coupons Found</h3>
                    <p className="text-gray-500 mt-2">Create your first discount coupon to boost sales!</p>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ code: '', type: 'flat', discount: 0, minOrderAmount: 0, usageLimit: '', status: 'active' });
                            setIsModalOpen(true);
                        }}
                        className="mt-6 inline-flex items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Add First Coupon
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-full shadow-sm border border-gray-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Coupon Code</label>
                                <div className="relative">
                                    <Ticket className="absolute left-4 top-3.5 h-5 w-5 text-orange-500 rotate-45" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.code} 
                                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-mono uppercase font-bold text-lg tracking-widest text-gray-900" 
                                        placeholder="e.g. WELCOME50" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Discount Type</label>
                                    <select 
                                        value={formData.type} 
                                        onChange={e => setFormData({...formData, type: e.target.value})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-semibold appearance-none"
                                    >
                                        <option value="flat">Flat Amount (₹)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">
                                        Discount Value
                                    </label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="1" 
                                        max={formData.type === 'percentage' ? 100 : undefined}
                                        value={formData.discount} 
                                        onChange={e => setFormData({...formData, discount: e.target.value ? parseFloat(e.target.value) : ''})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-bold text-lg" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Min. Order (₹)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0" 
                                        value={formData.minOrderAmount} 
                                        onChange={e => setFormData({...formData, minOrderAmount: e.target.value ? parseFloat(e.target.value) : 0})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-semibold" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Usage Limit</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={formData.usageLimit} 
                                        onChange={e => setFormData({...formData, usageLimit: e.target.value ? parseInt(e.target.value) : ''})} 
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-amber-500 outline-none transition-colors font-semibold" 
                                        placeholder="Unlimited"
                                    />
                                </div>
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

                            <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg rounded-xl transition-all shadow-md">
                                    {editingId ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Coupons;
