import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash2, Plus, Image as ImageIcon, CheckCircle, XCircle, ArrowRight, Eye, Edit2, Palette, Type, Move } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const AdminBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const defaultBannerState = {
        title: '',
        backgroundType: 'image', // 'image' or 'color'
        backgroundColor: '#FF8A00',
        imageUrl: '',
        overlayOpacity: 40,
        
        heading: '',
        headingColor: '#FFFFFF',
        headingSize: 'text-4xl',
        headingFont: 'font-sans',
        headingPos: { x: 10, y: 30 },
        
        subheading: '',
        subheadingColor: 'rgba(255,255,255,0.9)',
        subheadingSize: 'text-base',
        subheadingFont: 'font-sans',
        subheadingPos: { x: 10, y: 50 },

        buttonText: '',
        buttonLink: '',
        buttonColor: '#FFFFFF',
        buttonTextColor: '#EA580C',
        buttonSize: 'text-sm',
        buttonFont: 'font-sans',
        buttonPos: { x: 10, y: 70 },
        
        // Legacy
        alignment: 'left',
        status: 'active'
    };
    
    const [newBanner, setNewBanner] = useState(defaultBannerState);
    const [showForm, setShowForm] = useState(false);
    const [editingBannerId, setEditingBannerId] = useState(null);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'landingBanners'));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setBanners(data);
        } catch (error) {
            console.error("Error fetching banners", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const token = await useAuthStore.getState().user?.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/upload/banner`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: (() => {
                    const fd = new FormData();
                    fd.append('image', file);
                    return fd;
                })()
            });

            const data = await res.json();
            if (data.success) {
                setNewBanner(prev => ({ ...prev, imageUrl: data.url, backgroundType: 'image' }));
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

    const handleSaveBanner = async (e) => {
        e.preventDefault();
        if (newBanner.backgroundType === 'image' && !newBanner.imageUrl) {
            alert('Please upload an image for the banner or switch to solid color.');
            return;
        }

        try {
            if (editingBannerId) {
                await updateDoc(doc(db, 'landingBanners', editingBannerId), {
                    ...newBanner,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'landingBanners'), {
                    ...newBanner,
                    createdAt: new Date().toISOString()
                });
            }
            setShowForm(false);
            setEditingBannerId(null);
            setNewBanner(defaultBannerState);
            fetchBanners();
        } catch (error) {
            console.error("Error saving banner", error);
            alert("Failed to save banner");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this banner?")) return;
        try {
            await deleteDoc(doc(db, 'landingBanners', id));
            fetchBanners();
        } catch (error) {
            console.error("Error deleting banner", error);
        }
    };

    const toggleStatus = async (banner) => {
        try {
            const newStatus = banner.status === 'active' ? 'inactive' : 'active';
            await updateDoc(doc(db, 'landingBanners', banner.id), { status: newStatus });
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error("Error updating status", error);
        }
    };

    const BannerPreview = ({ banner, isEditable }) => {
        const bgStyle = banner.backgroundType === 'color' 
            ? { backgroundColor: banner.backgroundColor || '#FF8A00' }
            : {
                backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#333'
            };

        // Legacy fallback
        const alignClass = 
            banner.alignment === 'center' ? 'mx-auto text-center items-center' : 
            banner.alignment === 'right' ? 'ml-auto text-right items-end' : 
            'mr-auto text-left items-start';

        const hasPos = banner.headingPos !== undefined;

        return (
            <div 
                className="w-full h-64 md:h-80 rounded-3xl text-white shadow-lg relative overflow-hidden"
                style={bgStyle}
            >
                {banner.backgroundType === 'image' && (
                    <div 
                        className="absolute inset-0 bg-black pointer-events-none" 
                        style={{ opacity: (banner.overlayOpacity || 0) / 100 }}
                    ></div>
                )}

                {hasPos ? (
                    <>
                        {/* Absolute Positioned Mode */}
                        <div 
                            className={`absolute select-none`}
                            style={{ 
                                left: `${banner.headingPos?.x || 10}%`, 
                                top: `${banner.headingPos?.y || 30}%`,
                                transform: 'translate(0, -50%)',
                                color: banner.headingColor || '#FFFFFF'
                            }}
                        >
                            {banner.heading ? (
                                <h1 className={`font-bold leading-tight whitespace-pre-line ${banner.headingSize || 'text-4xl'} ${banner.headingFont || 'font-sans'}`}>
                                    {banner.heading}
                                </h1>
                            ) : (
                                <h1 className="text-4xl font-bold opacity-50">Heading</h1>
                            )}
                        </div>

                        <div 
                            className={`absolute select-none`}
                            style={{ 
                                left: `${banner.subheadingPos?.x || 10}%`, 
                                top: `${banner.subheadingPos?.y || 50}%`,
                                transform: 'translate(0, -50%)',
                                color: banner.subheadingColor || 'rgba(255,255,255,0.9)'
                            }}
                        >
                            {banner.subheading ? (
                                <p className={`whitespace-pre-line ${banner.subheadingSize || 'text-base'} ${banner.subheadingFont || 'font-sans'}`}>
                                    {banner.subheading}
                                </p>
                            ) : (
                                <p className="opacity-50 text-base">Subheading goes here</p>
                            )}
                        </div>

                        {(banner.buttonText) && (
                            <div 
                                className={`absolute select-none`}
                                style={{ 
                                    left: `${banner.buttonPos?.x || 10}%`, 
                                    top: `${banner.buttonPos?.y || 70}%`,
                                    transform: 'translate(0, -50%)'
                                }}
                            >
                                <div 
                                    className={`inline-flex items-center px-6 py-3 rounded-full font-bold shadow-sm pointer-events-none ${banner.buttonSize || 'text-sm'} ${banner.buttonFont || 'font-sans'}`}
                                    style={{ backgroundColor: banner.buttonColor || '#FFFFFF', color: banner.buttonTextColor || '#EA580C' }}
                                >
                                    {banner.buttonText || 'Button Text'} <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Legacy Mode */
                    <div className={`relative z-10 w-full h-full p-6 md:p-10 flex flex-col justify-center ${alignClass} pointer-events-none`}>
                        {banner.heading ? (
                            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 whitespace-pre-line" style={{ color: banner.headingColor || '#FFFFFF' }}>{banner.heading}</h1>
                        ) : (
                            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 opacity-50">Heading Text</h1>
                        )}
                        {banner.subheading ? (
                            <p className="mb-6 text-sm md:text-base whitespace-pre-line" style={{ color: banner.subheadingColor || 'rgba(255,255,255,0.9)' }}>{banner.subheading}</p>
                        ) : (
                            <p className="text-white/50 mb-6 text-sm md:text-base">Subheading text goes here</p>
                        )}
                        {banner.buttonText && (
                            <div className="inline-flex items-center bg-white text-orange-600 px-6 py-3 rounded-full font-bold text-sm shadow-sm cursor-default">
                                {banner.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;

    const fontOptions = ['font-sans', 'font-serif', 'font-mono'];
    const sizeOptions = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Home Banners</h1>
                    <p className="text-gray-500 font-medium mt-1">Advanced Canvas Builder</p>
                </div>
                <button 
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingBannerId(null);
                        setNewBanner(defaultBannerState);
                    }}
                    className="flex items-center bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800"
                >
                    {showForm ? 'Cancel' : <><Plus className="w-5 h-5 mr-2" /> Add Banner</>}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                            <Eye className="w-5 h-5 mr-2 text-orange-500" /> Banner Preview
                        </h2>
                        <p className="text-xs text-gray-500 mb-4">Adjust the Left and Top positions in the form below to move elements.</p>
                        <div className="border-4 border-gray-100 rounded-[2rem] p-2 bg-gray-50 touch-none">
                            <BannerPreview banner={newBanner} isEditable={true} />
                        </div>
                    </div>

                    <form onSubmit={handleSaveBanner} className="space-y-8 border-t border-gray-100 pt-6">
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banner Title (Internal Ref)</label>
                            <input 
                                type="text" 
                                required 
                                value={newBanner.title}
                                onChange={(e) => setNewBanner({...newBanner, title: e.target.value})}
                                className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Background Section */}
                            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                                    <ImageIcon className="w-4 h-4 mr-2" /> 1. Background
                                </h3>
                                <div className="flex space-x-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setNewBanner({...newBanner, backgroundType: 'image'})}
                                        className={`flex-1 py-2 text-sm font-bold rounded-xl border ${newBanner.backgroundType === 'image' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
                                    >
                                        Image
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewBanner({...newBanner, backgroundType: 'color'})}
                                        className={`flex-1 py-2 text-sm font-bold rounded-xl border ${newBanner.backgroundType === 'color' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
                                    >
                                        Solid Color
                                    </button>
                                </div>

                                {newBanner.backgroundType === 'image' ? (
                                    <>
                                        {newBanner.imageUrl ? (
                                            <div className="relative inline-block">
                                                <img src={newBanner.imageUrl} className="h-24 rounded-xl object-contain bg-gray-100 border border-gray-200" />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setNewBanner({...newBanner, imageUrl: ''})}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                        )}
                                        <div className="mt-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dark Overlay Opacity</label>
                                            <input type="range" min="0" max="100" value={newBanner.overlayOpacity || 0} onChange={(e) => setNewBanner({...newBanner, overlayOpacity: parseInt(e.target.value)})} className="w-full accent-black" />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Color</label>
                                        <input 
                                            type="color" 
                                            value={newBanner.backgroundColor || '#FF8A00'}
                                            onChange={(e) => setNewBanner({...newBanner, backgroundColor: e.target.value})}
                                            className="w-full h-12 rounded-xl cursor-pointer p-1"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Heading Section */}
                            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                                    <Type className="w-4 h-4 mr-2" /> 2. Heading
                                </h3>
                                <textarea rows="2" value={newBanner.heading} onChange={(e) => setNewBanner({...newBanner, heading: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="color" value={newBanner.headingColor || '#FFFFFF'} onChange={(e) => setNewBanner({...newBanner, headingColor: e.target.value})} className="w-full h-10 rounded-xl" />
                                    <select value={newBanner.headingSize || 'text-4xl'} onChange={(e) => setNewBanner({...newBanner, headingSize: e.target.value})} className="border rounded-xl px-2">
                                        {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={newBanner.headingFont || 'font-sans'} onChange={(e) => setNewBanner({...newBanner, headingFont: e.target.value})} className="border rounded-xl px-2">
                                        {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Left Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.headingPos?.x || 10} onChange={(e) => setNewBanner({...newBanner, headingPos: {...newBanner.headingPos, x: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Top Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.headingPos?.y || 30} onChange={(e) => setNewBanner({...newBanner, headingPos: {...newBanner.headingPos, y: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                </div>
                            </div>

                            {/* Subheading Section */}
                            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                                    <Type className="w-4 h-4 mr-2" /> 3. Subheading
                                </h3>
                                <textarea rows="2" value={newBanner.subheading} onChange={(e) => setNewBanner({...newBanner, subheading: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="color" value={newBanner.subheadingColor || '#FFFFFF'} onChange={(e) => setNewBanner({...newBanner, subheadingColor: e.target.value})} className="w-full h-10 rounded-xl" />
                                    <select value={newBanner.subheadingSize || 'text-base'} onChange={(e) => setNewBanner({...newBanner, subheadingSize: e.target.value})} className="border rounded-xl px-2">
                                        {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={newBanner.subheadingFont || 'font-sans'} onChange={(e) => setNewBanner({...newBanner, subheadingFont: e.target.value})} className="border rounded-xl px-2">
                                        {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Left Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.subheadingPos?.x || 10} onChange={(e) => setNewBanner({...newBanner, subheadingPos: {...newBanner.subheadingPos, x: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Top Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.subheadingPos?.y || 50} onChange={(e) => setNewBanner({...newBanner, subheadingPos: {...newBanner.subheadingPos, y: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                </div>
                            </div>

                            {/* Button Section */}
                            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                                    <Move className="w-4 h-4 mr-2" /> 4. Button
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" value={newBanner.buttonText} onChange={(e) => setNewBanner({...newBanner, buttonText: e.target.value})} placeholder="Text" className="w-full px-3 py-2 border rounded-xl" />
                                    <input type="text" value={newBanner.buttonLink} onChange={(e) => setNewBanner({...newBanner, buttonLink: e.target.value})} placeholder="Link" className="w-full px-3 py-2 border rounded-xl" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Bg Color</label>
                                        <input type="color" value={newBanner.buttonColor || '#FFFFFF'} onChange={(e) => setNewBanner({...newBanner, buttonColor: e.target.value})} className="w-full h-8 rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Text Color</label>
                                        <input type="color" value={newBanner.buttonTextColor || '#EA580C'} onChange={(e) => setNewBanner({...newBanner, buttonTextColor: e.target.value})} className="w-full h-8 rounded-lg" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={newBanner.buttonSize || 'text-sm'} onChange={(e) => setNewBanner({...newBanner, buttonSize: e.target.value})} className="border rounded-xl px-2 py-1">
                                        {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={newBanner.buttonFont || 'font-sans'} onChange={(e) => setNewBanner({...newBanner, buttonFont: e.target.value})} className="border rounded-xl px-2 py-1">
                                        {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Left Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.buttonPos?.x || 10} onChange={(e) => setNewBanner({...newBanner, buttonPos: {...newBanner.buttonPos, x: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold mb-1 block">Top Position (%)</label>
                                        <input type="range" min="0" max="100" value={newBanner.buttonPos?.y || 70} onChange={(e) => setNewBanner({...newBanner, buttonPos: {...newBanner.buttonPos, y: parseInt(e.target.value)}})} className="w-full accent-black" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button type="submit" disabled={uploadingImage || (newBanner.backgroundType === 'image' && !newBanner.imageUrl)} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50">
                                {editingBannerId ? 'Update Banner' : 'Save Banner'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {banners.map((banner) => (
                    <div key={banner.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <div className="p-2 bg-gray-50">
                            <div className="border border-gray-200 rounded-3xl overflow-hidden pointer-events-none scale-[0.95] origin-top h-48 md:h-64">
                                <BannerPreview banner={banner} isEditable={false} />
                            </div>
                        </div>
                        <div className="p-5 flex justify-between items-center bg-white border-t border-gray-100 mt-auto">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{banner.title}</h3>
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => {
                                        setNewBanner({ ...defaultBannerState, ...banner });
                                        setEditingBannerId(banner.id);
                                        setShowForm(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl"
                                ><Edit2 className="w-5 h-5" /></button>
                                <button 
                                    onClick={() => toggleStatus(banner)}
                                    className={`p-2.5 rounded-xl font-bold ${banner.status === 'active' ? 'text-gray-500 bg-gray-50' : 'text-green-600 bg-green-50'}`}
                                >{banner.status === 'active' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}</button>
                                <button onClick={() => handleDelete(banner.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminBanners;
