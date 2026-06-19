import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const Plans = () => {
    const [plans, setPlans] = useState([]);
    const [subscriptionCategories, setSubscriptionCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mealType: subscriptionCategories[0]?.name || 'Lunch', // Breakfast, Lunch, Dinner
        mealCount: 7,
        price: 0,
        bookingOpenTime: '10:00 AM',
        cutoffTime: '11:00 PM',
        imageUrl: '',
        deliverySlots: []
    });
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [newSlotStart, setNewSlotStart] = useState('');
    const [newSlotEnd, setNewSlotEnd] = useState('');

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'subscriptionPlans'));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setPlans(data);
            
            // Also fetch subscription categories
            const catSnap = await getDocs(query(collection(db, 'subscriptionCategories'), where('status', '==', 'active')));
            const catData = [];
            catSnap.forEach(doc => catData.push({ id: doc.id, ...doc.data() }));
            catData.sort((a, b) => (a.order || 999) - (b.order || 999));
            setSubscriptionCategories(catData);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    useEffect(() => {
        if (subscriptionCategories.length > 0 && isModalOpen && !editingId) {
            const isValid = subscriptionCategories.some(c => c.name === formData.mealType);
            if (!isValid) {
                setFormData(prev => ({ ...prev, mealType: subscriptionCategories[0].name }));
            }
        }
    }, [subscriptionCategories, isModalOpen, formData.mealType, editingId]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'subscriptionPlans', editingId), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'subscriptionPlans'), {
                    ...formData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    subscriptionMenuIds: []
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchPlans();
        } catch (error) {
            console.error("Error saving plan", error);
            alert("Error saving plan: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this plan?")) {
            try {
                await deleteDoc(doc(db, 'subscriptionPlans', id));
                fetchPlans();
            } catch (error) {
                console.error("Error deleting plan", error);
            }
        }
    };

    const openEdit = (plan) => {
        setFormData({
            name: plan.name,
            mealType: plan.mealType,
            mealCount: plan.mealCount,
            price: plan.price,
            bookingOpenTime: plan.bookingOpenTime || '10:00 AM',
            cutoffTime: plan.cutoffTime,
            status: plan.status,
            imageUrl: plan.imageUrl || '',
            deliverySlots: plan.deliverySlots || []
        });
        setEditingId(plan.id);
        setIsModalOpen(true);
    };

    const parseTime = (timeStr) => {
        if (!timeStr) return '';
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let [_, h, m, ampm] = match;
            h = parseInt(h, 10);
            if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
            if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
            return `${h.toString().padStart(2, '0')}:${m}`;
        }
        return timeStr;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hoursStr = hours < 10 ? '0' + hours : hours;
        return `${hoursStr}:${minutes} ${ampm}`;
    };

    const addDeliverySlot = () => {
        if (newSlotStart && newSlotEnd) {
            const formattedStart = formatTime(newSlotStart);
            const formattedEnd = formatTime(newSlotEnd);
            const slotString = `${formattedStart} - ${formattedEnd}`;
            setFormData(prev => ({
                ...prev,
                deliverySlots: [...(prev.deliverySlots || []), slotString]
            }));
            setNewSlotStart('');
            setNewSlotEnd('');
        }
    };

    const removeDeliverySlot = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            deliverySlots: prev.deliverySlots.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const token = await useAuthStore.getState().user?.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/upload/plan-banner`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: (() => {
                    const fd = new FormData();
                    fd.append('image', file);
                    return fd;
                })()
            });

            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, imageUrl: data.url }));
            } else {
                alert("Upload failed: " + data.message);
            }
        } catch (error) {
            console.error("Image upload error", error);
            alert("Error uploading image");
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) return <div className="p-4">Loading plans...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
                    <p className="text-gray-500">Manage all meal subscription packages</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', mealType: subscriptionCategories[0]?.name || 'Lunch', mealCount: 7, price: 0, bookingOpenTime: '10:00 AM', cutoffTime: '11:00 PM', status: 'active', imageUrl: '', deliverySlots: [] });
                        setNewSlotStart('');
                        setNewSlotEnd('');
                        setIsModalOpen(true);
                    }}
                    className="flex items-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                    <Plus className="h-5 w-5 mr-2" /> Add Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative">
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 z-10">
                            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full shadow-sm backdrop-blur-md ${plan.status === 'active' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                {plan.status}
                            </span>
                        </div>

                        {/* Banner Image */}
                        <div className="w-full bg-gray-100 relative overflow-hidden">
                            {plan.imageUrl ? (
                                <img src={plan.imageUrl} alt={plan.name} className="w-full h-auto max-h-[300px] object-cover group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200">
                                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                    <span className="text-xs font-semibold uppercase tracking-widest">No Image</span>
                                </div>
                            )}
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                            
                            {/* Floating Price */}
                            <div className="absolute bottom-4 left-4">
                                <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xl px-4 py-1.5 rounded-xl shadow-lg border border-white/20">
                                    ₹{plan.price}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors leading-tight mb-1">{plan.name}</h3>
                                <div className="flex items-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    <span>{plan.mealType}</span>
                                    <span className="mx-2">•</span>
                                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded border border-orange-200">{plan.mealCount} Days</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 flex-1">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Booking Opens</span>
                                    <span className="text-sm font-semibold text-gray-800">{plan.bookingOpenTime || '10:00 AM'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cutoff Time</span>
                                    <span className="text-sm font-semibold text-gray-800">{plan.cutoffTime || '11:00 PM'}</span>
                                </div>
                            </div>

                            <div className="flex space-x-3 mt-auto">
                                <button 
                                    onClick={() => openEdit(plan)} 
                                    className="flex-1 flex items-center justify-center bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-black transition-colors"
                                >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(plan.id)} 
                                    className="flex items-center justify-center bg-red-50 text-red-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {plans.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Plans Found</h3>
                    <p className="text-gray-500 mt-2 mb-6">You haven't created any subscription packages yet.</p>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', mealType: subscriptionCategories[0]?.name || 'Lunch', mealCount: 7, price: 0, bookingOpenTime: '10:00 AM', cutoffTime: '11:00 PM', status: 'active', imageUrl: '', deliverySlots: [] });
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Create First Plan
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold">{editingId ? 'Edit Plan' : 'Create Plan'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                                <div className="flex items-center space-x-4">
                                    {formData.imageUrl ? (
                                        <div className="relative">
                                            <img src={formData.imageUrl} alt="Plan Banner" className="h-20 w-32 object-cover rounded-lg border border-gray-200" />
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData({...formData, imageUrl: ''})}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-20 w-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative hover:bg-gray-50 transition-colors">
                                            {uploadingImage ? (
                                                <span className="text-xs text-gray-500 font-medium">Uploading...</span>
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                    <span className="text-xs text-gray-500">Upload Image</span>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload}
                                                disabled={uploadingImage}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" placeholder="e.g. 7 Day Lunch" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                                    <select value={formData.mealType} onChange={e => setFormData({...formData, mealType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                        {subscriptionCategories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                        {subscriptionCategories.length === 0 && <option value="Lunch">Lunch (Fallback)</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meal Count</label>
                                    <input type="number" required min="1" value={formData.mealCount} onChange={e => setFormData({...formData, mealCount: e.target.value ? parseInt(e.target.value) : ''})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value ? parseFloat(e.target.value) : ''})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Opens At</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={parseTime(formData.bookingOpenTime)} 
                                        onChange={e => setFormData({...formData, bookingOpenTime: formatTime(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cutoff Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={parseTime(formData.cutoffTime)} 
                                        onChange={e => setFormData({...formData, cutoffTime: formatTime(e.target.value)})} 
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Slots</label>
                                <div className="flex items-center space-x-2 mb-3">
                                    <input 
                                        type="time" 
                                        value={newSlotStart} 
                                        onChange={e => setNewSlotStart(e.target.value)} 
                                        className="px-3 py-2 border rounded-lg focus:ring-black focus:border-black text-sm w-32"
                                    />
                                    <span className="text-gray-500 font-medium">to</span>
                                    <input 
                                        type="time" 
                                        value={newSlotEnd} 
                                        onChange={e => setNewSlotEnd(e.target.value)} 
                                        className="px-3 py-2 border rounded-lg focus:ring-black focus:border-black text-sm w-32"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={addDeliverySlot}
                                        disabled={!newSlotStart || !newSlotEnd}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 ml-2"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.deliverySlots && formData.deliverySlots.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.deliverySlots.map((slot, idx) => (
                                            <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                                                <span>{slot}</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeDeliverySlot(idx)}
                                                    className="ml-2 text-gray-400 hover:text-red-500"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400">No delivery slots added. Users won't be able to select a time.</p>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg mr-2">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg">Save Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Plans;
