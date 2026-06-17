import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Gift } from 'lucide-react';

const AdminRewards = () => {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        thresholdAmount: '',
        type: 'flat', // flat or percentage
        discount: '',
        minOrderAmount: 0,
        status: 'active'
    });
    const [editingId, setEditingId] = useState(null);

    const fetchTiers = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'rewardTiers'));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            // Sort by threshold amount
            data.sort((a, b) => a.thresholdAmount - b.thresholdAmount);
            setTiers(data);
        } catch (error) {
            console.error("Error fetching reward tiers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTiers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                thresholdAmount: Number(formData.thresholdAmount),
                type: formData.type,
                discount: Number(formData.discount),
                minOrderAmount: Number(formData.minOrderAmount),
                status: formData.status
            };

            if (editingId) {
                await updateDoc(doc(db, 'rewardTiers', editingId), {
                    ...dataToSave,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'rewardTiers'), {
                    ...dataToSave,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchTiers();
        } catch (error) {
            console.error("Error saving reward tier", error);
            alert("Error saving reward tier: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this reward tier?")) {
            try {
                await deleteDoc(doc(db, 'rewardTiers', id));
                fetchTiers();
            } catch (error) {
                console.error("Error deleting reward tier", error);
            }
        }
    };

    const openEdit = (tier) => {
        setFormData({
            thresholdAmount: tier.thresholdAmount,
            type: tier.type,
            discount: tier.discount,
            minOrderAmount: tier.minOrderAmount || 0,
            status: tier.status
        });
        setEditingId(tier.id);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setFormData({
            thresholdAmount: '',
            type: 'flat',
            discount: '',
            minOrderAmount: 0,
            status: 'active'
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-4">Loading reward tiers...</div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reward Tiers</h1>
                    <p className="text-gray-500 mt-1">Manage loyalty rewards based on user total spend</p>
                </div>
                <button 
                    onClick={openAdd}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Tier
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Spend Target</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Reward Details</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Min Order Limit</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tiers.map((tier) => (
                                <tr key={tier.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">₹{tier.thresholdAmount}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-sm bg-orange-50 text-orange-600 border border-orange-100">
                                            <Gift className="w-4 h-4 mr-1.5" />
                                            {tier.type === 'flat' ? `Flat ₹${tier.discount} OFF` : `${tier.discount}% OFF`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {tier.minOrderAmount > 0 ? `₹${tier.minOrderAmount}` : 'No minimum'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            tier.status === 'active' 
                                            ? 'bg-green-100 text-green-700 border border-green-200' 
                                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                            {tier.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-3">
                                            <button 
                                                onClick={() => openEdit(tier)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tier.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tiers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No reward tiers found. Add one to get started!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Edit Reward Tier' : 'Add Reward Tier'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Spend Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                                    value={formData.thresholdAmount}
                                    onChange={(e) => setFormData({...formData, thresholdAmount: e.target.value})}
                                    placeholder="e.g. 5000"
                                />
                                <p className="text-xs text-gray-500 mt-1">User must spend this total amount to unlock.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Reward Type</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                        value={formData.type}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="flat">Flat Amount</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Discount {formData.type === 'flat' ? '(₹)' : '(%)'}
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={formData.type === 'percentage' ? 100 : undefined}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({...formData, discount: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Amount to Use Coupon (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                    value={formData.minOrderAmount}
                                    onChange={(e) => setFormData({...formData, minOrderAmount: e.target.value})}
                                    placeholder="0 for no minimum"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                                >
                                    {editingId ? 'Update Tier' : 'Add Tier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRewards;
