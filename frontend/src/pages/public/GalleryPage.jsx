import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';

const GalleryPage = () => {
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.documentElement.style.fontSize = '14px';
        return () => {
            document.documentElement.style.fontSize = ''; // Reset on unmount
        };
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchGallery = async () => {
            try {
                // Fetch all gallery images, ordered by newest first
                const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
                const galleryData = [];
                gallerySnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            }
                    }
                    galleryData.push({ id: doc.id, ...data });
                });
                setGallery(galleryData);
            } catch (error) {
                console.error("Error fetching gallery data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans selection:bg-orange-500 selection:text-white">
            {/* Minimal Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                            <img src="/logo.png" alt="Vrindavan Logo" className="h-16 w-16 object-contain scale-[1.5] origin-left ml-2 md:ml-4" />
                        </div>
                        <Link 
                            to="/"
                            className="flex items-center text-sm font-bold text-gray-600 hover:text-orange-500 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-28 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Our Gallery</h1>
                        <p className="mt-4 text-xl text-gray-500 max-w-2xl">A full visual collection of the delicious, hygienic meals we serve every day.</p>
                    </div>

                    {gallery.length > 0 ? (
                        <div className="columns-2 md:columns-3 lg:columns-4 gap-1 md:gap-2">
                            {gallery.map((img) => (
                                <div key={img.id} className="mb-1 md:mb-2 relative rounded-2xl overflow-hidden shadow-sm group break-inside-avoid">
                                    {img.imageUrl.toLowerCase().endsWith('.mp4') || img.imageUrl.toLowerCase().endsWith('.mov') || img.imageUrl.toLowerCase().endsWith('.webm') ? (
            <video src={img.imageUrl} className="w-full h-auto object-cover bg-gray-200 group-hover:scale-105 transition-transform duration-700" autoPlay muted loop playsInline />
        ) : (
            <img src={img.imageUrl} alt="Gallery item" className="w-full h-auto object-cover bg-gray-200 group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                            <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-5" />
                            <h3 className="text-xl font-bold text-gray-900">No Images Yet</h3>
                            <p className="text-gray-500 mt-2">More photos coming soon...</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-gray-100 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <img src="/logo.png" alt="Vrindavan Logo" className="h-10 w-10 object-contain scale-[1.5]" />
                        <span className="text-lg font-black tracking-tight text-gray-900 ml-2">VRINDAVAN</span>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">© {new Date().getFullYear()} Vrindavan. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default GalleryPage;
