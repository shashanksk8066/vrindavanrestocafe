import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Image as ImageIcon, Plus } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const AdminGallery = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'gallery'));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setImages(data);
        } catch (error) {
            console.error("Error fetching gallery", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const token = await useAuthStore.getState().user?.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/upload/gallery`, {
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
                // Save to firestore immediately
                await addDoc(collection(db, 'gallery'), {
                    imageUrl: data.url,
                    createdAt: new Date().toISOString()
                });
                fetchImages();
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

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this image?")) return;
        try {
            await deleteDoc(doc(db, 'gallery', id));
            fetchImages();
        } catch (error) {
            console.error("Error deleting image", error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gallery Images</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage images displayed in the Landing Page Gallery section</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between">
                <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">Upload New Photo</h3>
                    <p className="text-sm text-gray-500">Supported formats: JPG, PNG, WEBP (Max 10MB)</p>
                </div>
                <div className="relative overflow-hidden inline-block">
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center hover:bg-gray-800 transition-colors pointer-events-none">
                        {uploadingImage ? 'Uploading...' : <><Plus className="w-5 h-5 mr-2" /> Upload Photo</>}
                    </button>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                    <div key={img.id} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm aspect-square bg-gray-100">
                        <img src={img.imageUrl} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                onClick={() => handleDelete(img.id)}
                                className="bg-white text-red-600 p-3 rounded-full hover:bg-red-50 hover:scale-110 transition-all shadow-lg"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {images.length === 0 && (
                <div className="py-16 text-center bg-white border border-gray-100 rounded-3xl">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900">Gallery is Empty</h3>
                    <p className="text-gray-500 text-sm mt-1">Upload images to display them on the landing page.</p>
                </div>
            )}
        </div>
    );
};

export default AdminGallery;
