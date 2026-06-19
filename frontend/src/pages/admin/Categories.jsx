import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Power } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const Categories = () => {
    const [activeTab, setActiveTab] = useState('mainMenu');
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        imageUrl: '',
        status: 'active',
        order: 0
    });

    const fetchCategories = async (currentTab) => {
        setLoading(true);
        setCategories([]); // Clear old categories to avoid showing them on error
        try {
            const collectionName = currentTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
            const snapshot = await getDocs(collection(db, collectionName));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => {
                const orderA = (!a.order || a.order === 0) ? 999 : a.order;
                const orderB = (!b.order || b.order === 0) ? 999 : b.order;
                return orderA - orderB;
            });
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories", error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories(activeTab);
    }, [activeTab]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        setUploadingImage(true);
        try {
            const token = await useAuthStore.getState().user?.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/upload/category-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
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
            const collectionName = activeTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
            if (editingId) {
                await updateDoc(doc(db, collectionName, editingId), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, collectionName), {
                    ...formData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchCategories(activeTab);
        } catch (error) {
            console.error("Error saving category", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                const collectionName = activeTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
                await deleteDoc(doc(db, collectionName, id));
                fetchCategories(activeTab);
            } catch (error) {
                console.error("Error deleting category", error);
            }
        }
    };

    
    const handleToggleStatus = async (e, category) => {
        e.stopPropagation();
        try {
            const newStatus = category.status === 'active' ? 'inactive' : 'active';
            const collectionName = activeTab === 'subscriptionMenu' ? 'subscriptionCategories' : 'categories';
            await updateDoc(doc(db, collectionName, category.id), { status: newStatus });
            setCategories(categories.map(c => c.id === category.id ? { ...c, status: newStatus } : c));
        } catch (error) {
            console.error("Error updating category status", error);
        }
    };

    const openEdit = (category) => {
        setFormData({
            name: category.name || '',
            imageUrl: category.imageUrl || '',
            status: category.status || 'active',
            order: category.order || 0
        });
        setEditingId(category.id);
        setIsModalOpen(true);
    };

    if (loading) return <div className="p-4">Loading categories...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-gray-500">Manage main menu and food categories</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', imageUrl: '', status: 'active', order: 0 });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
                >
                    <Plus className="h-5 w-5 mr-2" /> Add Category
                </button>
            </div>

            
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('mainMenu')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'mainMenu' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Main Menu Categories
                </button>
                <button
                    onClick={() => setActiveTab('subscriptionMenu')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'subscriptionMenu' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Subscription Categories
                </button>
            </div>
    
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((cat) => (
                    <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                        <div className="h-40 bg-gray-100 relative">
                            {cat.imageUrl ? (
                                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-gray-300" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(cat)} className="p-2 bg-white rounded-lg shadow text-blue-600 hover:text-blue-800">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={(e) => handleToggleStatus(e, cat)} 
                                    title={cat.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
                                    className={`p-2 bg-white rounded-lg shadow ${cat.status === 'active' ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Power className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(cat.id)} className="p-2 bg-white rounded-lg shadow text-red-600 hover:text-red-800">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 text-lg">{cat.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {cat.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {categories.length === 0 && (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-100">
                    <p className="text-gray-500">No categories found.</p>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold">{editingId ? 'Edit Category' : 'Create Category'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                                <div className="flex items-center space-x-4">
                                    {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        className="text-sm" 
                                        disabled={uploadingImage}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" placeholder="e.g. Breakfast" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order (e.g., 1, 2, 3)</label>
                                <input 
                                    type="number" 
                                    value={formData.order} 
                                    onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} 
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-black focus:border-black" 
                                    placeholder="0" 
                                />
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg mr-2">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg" disabled={uploadingImage}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
