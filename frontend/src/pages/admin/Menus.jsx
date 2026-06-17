import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const Menus = () => {
    const [activeTab, setActiveTab] = useState('subscriptionMenu'); // 'subscriptionMenu' or 'mainMenu'
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        parcelCharges: 0,
        imageUrl: '',
        status: 'active',
        category: 'Lunch',
        foodType: 'veg',
        isTodaysSpecial: false,
        isAddon: false,
        newCategoryName: ''
    });

    const fetchItems = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, activeTab));
            const dataList = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.imageUrl) {
                    if (data.imageUrl.includes('ngrok-free.app')) {
                        data.imageUrl = data.imageUrl.replace(/https:\/\/[^\/]+/, `http://${window.location.hostname}:5050`);
                    } else if (data.imageUrl.includes('localhost')) {
                        data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                    }
                }
                dataList.push({ id: doc.id, ...data });
            });
            setItems(dataList);
        } catch (error) {
            console.error("Error fetching menu items", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (currentTab) => {
        setCategories([]); // Clear old ones
        try {
            const collectionName = currentTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
            const snapshot = await getDocs(collection(db, collectionName));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories", error);
            setCategories([]);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchCategories(activeTab);
    }, [activeTab]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        setUploadingImage(true);
        try {
            // Note: Since we need to hit our Node backend for image processing and local VPS storage
            const token = await useAuthStore.getState().user?.getIdToken();
            const res = await fetch(`http://localhost:5050/api/upload/menu-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: uploadData
            });
            const result = await res.json();
            if (result.success) {
                setFormData(prev => ({ ...prev, imageUrl: result.url }));
            } else {
                alert("Image upload failed");
            }
        } catch (error) {
            console.error("Upload error", error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let finalCategory = formData.category;
            
            // If they opted to create a new category
            if (formData.category === 'NEW_CATEGORY' && formData.newCategoryName.trim()) {
                const collectionName = activeTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
                await addDoc(collection(db, collectionName), {
                    name: formData.newCategoryName.trim(),
                    status: 'active',
                    order: categories.length + 1,
                    createdAt: new Date().toISOString()
                });
                finalCategory = formData.newCategoryName.trim();
            }

            const dataToSave = { ...formData, category: finalCategory };
            delete dataToSave.newCategoryName; // Don't save this field to db

            if (editingId) {
                await updateDoc(doc(db, activeTab, editingId), {
                    ...dataToSave,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, activeTab), {
                    ...dataToSave,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchCategories(activeTab); // Refresh categories to show the new one
            fetchItems();
        } catch (error) {
            console.error("Error saving menu item", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, activeTab, id));
                fetchItems();
            } catch (error) {
                console.error("Error deleting item", error);
            }
        }
    };

    const openEdit = (item) => {
        setFormData({
            name: item.name || '',
            description: item.description || '',
            price: item.price || 0,
            parcelCharges: item.parcelCharges || 0,
            imageUrl: item.imageUrl || '',
            status: item.status || 'active',
            category: item.category || 'Lunch',
            foodType: item.foodType || 'veg',
            isTodaysSpecial: item.isTodaysSpecial || false,
            isAddon: item.isAddon || false,
            newCategoryName: ''
        });
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
                    <p className="text-gray-500">Manage Subscription and Main Menu items</p>
                </div>
                <div className="flex space-x-3 shrink-0">
                    <Link 
                        to="/admin/categories"
                        className="flex items-center bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Settings2 className="h-5 w-5 mr-2" /> Manage Categories
                    </Link>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', description: '', price: 0, parcelCharges: 0, imageUrl: '', status: 'active', category: 'Lunch', foodType: 'veg', isTodaysSpecial: false, isAddon: false,
        newCategoryName: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Add Item
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('subscriptionMenu')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'subscriptionMenu' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Subscription Menu
                </button>
                <button
                    onClick={() => setActiveTab('mainMenu')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'mainMenu' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Main Menu
                </button>
            </div>

            {loading ? (
                <div className="p-4 flex items-center justify-center text-gray-500 font-medium h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mr-3"></div>
                    Loading menu items...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col relative">
                            {/* Status and Type Badges */}
                            <div className="absolute top-4 left-4 z-10 flex space-x-2">
                                <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm backdrop-blur-md border ${
                                    item.foodType === 'non-veg' ? 'bg-red-500/90 text-white border-red-400' : 
                                    item.foodType === 'egg' ? 'bg-yellow-500/90 text-white border-yellow-400' : 
                                    'bg-green-500/90 text-white border-green-400'
                                }`}>
                                    {item.foodType || 'veg'}
                                </span>
                            </div>
                            <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
                                <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full shadow-sm backdrop-blur-md ${item.status === 'active' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                    {item.status}
                                </span>
                                {item.isTodaysSpecial && (
                                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm bg-purple-500/90 text-white border border-purple-400">
                                        ⭐ Special
                                    </span>
                                )}
                                {item.isAddon && (
                                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm bg-blue-500/90 text-white border border-blue-400">
                                        ➕ Add-on
                                    </span>
                                )}
                            </div>

                            {/* Image */}
                            <div className="h-48 w-full bg-gray-100 relative overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-200">
                                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                        <span className="text-xs font-semibold uppercase tracking-widest">No Image</span>
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                
                                {/* Floating Price & Category */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                    <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl">
                                        {item.category}
                                    </span>
                                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xl px-4 py-1.5 rounded-xl shadow-lg border border-white/20">
                                        ₹{item.price}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors leading-tight mb-2">{item.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-6">{item.description}</p>
                                
                                <div className="flex space-x-3 mt-auto">
                                    <button 
                                        onClick={() => openEdit(item)} 
                                        className="flex-1 flex items-center justify-center bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-black transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)} 
                                        className="flex items-center justify-center bg-red-50 text-red-600 font-semibold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {!loading && items.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm mt-6">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Items Found</h3>
                    <p className="text-gray-500 mt-2 mb-6">You haven't created any menu items here yet.</p>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', description: '', price: 0, parcelCharges: 0, imageUrl: '', status: 'active', category: categories[0]?.id || 'Lunch', foodType: 'veg', isTodaysSpecial: false, isAddon: false,
        newCategoryName: '' });
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Plus className="h-5 w-5 mr-2" /> Add First Item
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold">{editingId ? 'Edit Item' : 'Add Item'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Image</label>
                                <div className="flex items-center space-x-4">
                                    {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        className="text-sm" 
                                        disabled={uploadingImage}
                                    />
                                    {uploadingImage && <span className="text-xs text-blue-500">Uploading...</span>}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" rows="2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                        <option value="NEW_CATEGORY" className="font-bold text-amber-600">+ Create New Category</option>
                                    </select>
                                    {formData.category === 'NEW_CATEGORY' && (
                                        <div className="mt-2">
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="Enter new category name..." 
                                                value={formData.newCategoryName} 
                                                onChange={e => setFormData({...formData, newCategoryName: e.target.value})} 
                                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-amber-500 focus:border-amber-500" 
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Food Type</label>
                                    <select value={formData.foodType || 'veg'} onChange={e => setFormData({...formData, foodType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                        <option value="veg">Veg</option>
                                        <option value="non-veg">Non-Veg</option>
                                        <option value="egg">Egg</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Charges (₹)</label>
                                    <input type="number" required min="0" value={formData.parcelCharges} onChange={e => setFormData({...formData, parcelCharges: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex flex-col space-y-3 pt-2 pb-2">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="todaysSpecial" 
                                        checked={formData.isTodaysSpecial} 
                                        onChange={e => setFormData({...formData, isTodaysSpecial: e.target.checked})} 
                                        className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <label htmlFor="todaysSpecial" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Mark as "Today's Special"
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox" 
                                        id="isAddon" 
                                        checked={formData.isAddon} 
                                        onChange={e => setFormData({...formData, isAddon: e.target.checked})} 
                                        className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isAddon" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Available as Add-on in Subscription Booking
                                    </label>
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg mr-2">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg" disabled={uploadingImage}>Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menus;
