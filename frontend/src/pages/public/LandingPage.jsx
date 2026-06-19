import SEO from '../../components/SEO';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ArrowRight, Star, Quote, Calendar, Truck, ShieldCheck, Utensils, Heart } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const LandingPage = () => {
    const { user, role } = useAuthStore();
    const navigate = useNavigate();

    const [banners, setBanners] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [gallery, setGallery] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Scale down UI for landing page (matches dashboard scale)
    useEffect(() => {
        document.documentElement.style.fontSize = '14px';
        return () => {
            document.documentElement.style.fontSize = ''; // Reset on unmount
        };
    }, []);

    useEffect(() => {
        const fetchLandingData = async () => {
            try {
                // Fetch Banners
                const bannerQ = query(collection(db, 'landingBanners'), where('status', '==', 'active'));
                const bannerSnap = await getDocs(bannerQ);
                const bannerData = [];
                bannerSnap.forEach(doc => bannerData.push({ id: doc.id, ...doc.data() }));
                setBanners(bannerData);

                // Fetch Reviews
                const reviewQ = query(collection(db, 'reviews'), where('showOnLanding', '==', true));
                const reviewSnap = await getDocs(reviewQ);
                const reviewData = [];
                reviewSnap.forEach(doc => reviewData.push({ id: doc.id, ...doc.data() }));
                setReviews(reviewData);

                // Fetch Gallery
                const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
                let galleryData = [];
                gallerySnap.forEach(doc => {
                    const data = doc.data();
                    if (data.showOnHome) {
                        galleryData.push({ id: doc.id, ...data });
                    }
                });
                galleryData = galleryData.slice(0, 8);
                setGallery(galleryData);

            } catch (error) {
                console.error("Error fetching landing data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLandingData();
    }, []);

    // Autoplay logic for sliders
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    useEffect(() => {
        if (reviews.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentReviewIndex(prev => (prev + 1) % reviews.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [reviews.length]);

    const handleCTA = () => {
        if (user) {
            if (role === 'admin') navigate('/admin');
            else if (role === 'delivery') navigate('/delivery');
            else navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <SEO 
                title="Welcome to Vrindavan Resto Cafe" 
                description="Vrindavan Resto Cafe is your destination for authentic South Indian and North Indian vegetarian food. Visit us near Acharya College, Solladevanahalli."
                canonical="/welcome"
                keywords="Vrindavan Resto Cafe, Best Cafe in Solladevanahalli, Restaurant Near Me"
            />
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-orange-500 selection:text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                            <img src="/logo.png" alt="Vrindavan Logo" className="h-20 w-20 object-contain scale-[2] origin-left ml-2 md:ml-4" loading="lazy" />
                        </div>
                        <div className="flex items-center space-x-4 md:space-x-8">
                            <a href="#about" className="text-sm font-bold text-gray-600 hover:text-orange-500 hidden md:block transition-colors">About Us</a>
                            <a href="#gallery" className="text-sm font-bold text-gray-600 hover:text-orange-500 hidden md:block transition-colors">Gallery</a>
                            <a href="#reviews" className="text-sm font-bold text-gray-600 hover:text-orange-500 hidden md:block transition-colors">Reviews</a>
                            <button 
                                onClick={handleCTA}
                                className="bg-black text-white px-6 py-2.5 rounded-full font-bold hover:bg-gray-800 hover:scale-105 transition-all shadow-lg"
                            >
                                {user ? 'Go to Dashboard' : 'Order Now'}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-20">
                {/* 1. Hero Section */}
                <section className="relative overflow-hidden bg-[#FAFAFA] pt-12 sm:pt-24 lg:pt-32 pb-8 sm:pb-12 lg:pb-16">
                    {/* Refined Background Gradients */}
                    <div className="absolute top-0 right-0 -mr-10 md:-mr-20 -mt-10 md:-mt-20 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-orange-100/40 rounded-full blur-[60px] md:blur-[100px] -z-10"></div>
                    <div className="absolute bottom-0 left-0 -ml-10 md:-ml-20 -mb-10 md:-mb-20 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-amber-100/30 rounded-full blur-[50px] md:blur-[80px] -z-10"></div>
                    
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center space-x-2 bg-white border border-orange-100 text-orange-600 px-4 md:px-5 py-1.5 md:py-2 rounded-full mb-6 md:mb-8 shadow-sm">
                            <Utensils className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[9px] md:text-[11px] font-black tracking-[0.2em] uppercase">Pure Veg Culinary Experience</span>
                        </div>
                        <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[1.15] md:leading-[1.1] mb-4 md:mb-6">
                            Experience the divine taste of<br className="hidden md:block"/>{' '}
                            <span className="text-orange-500">
                                Vrindavan.
                            </span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-base md:text-xl text-gray-500 font-medium mb-10 md:mb-16 leading-relaxed">
                            Authentic, hygienic, and purely vegetarian meals prepared with devotion, delivered fresh to your door.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto mb-10 md:mb-16">
                            <div className="relative group">
                                <div className="absolute -inset-2 md:-inset-3 bg-gradient-to-r from-orange-300 to-amber-200 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-70 transition duration-500 z-0"></div>
                                <div className="relative z-10 flex flex-col items-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2rem] shadow-sm border border-gray-100/50 transition-all duration-300 h-full">
                                    <div className="bg-orange-50 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-orange-500 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Calendar className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <h3 className="font-black text-gray-900 text-lg md:text-xl mb-2 md:mb-3">Meal Subscriptions</h3>
                                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-medium">Flexible daily, weekly, or monthly plans tailored to your diet. Never worry about what to eat.</p>
                                </div>
                            </div>
                            
                            <div className="relative group">
                                <div className="absolute -inset-2 md:-inset-3 bg-gradient-to-r from-orange-300 to-amber-200 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-70 transition duration-500 z-0"></div>
                                <div className="relative z-10 flex flex-col items-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[2rem] shadow-sm border border-gray-100/50 transition-all duration-300 h-full">
                                    <div className="bg-green-50 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-green-600 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Truck className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <h3 className="font-black text-gray-900 text-lg md:text-xl mb-2 md:mb-3">Free Home Delivery</h3>
                                    <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-medium">Hot & fresh meals delivered right to your doorstep at zero extra cost every single day.</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleCTA}
                            className="bg-gray-900 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-full font-black text-xs md:text-sm tracking-widest uppercase hover:bg-orange-500 hover:shadow-[0_20px_50px_rgba(249,115,22,0.3)] transition-all duration-300 flex items-center mx-auto"
                        >
                            Order Now <ArrowRight className="ml-2 md:ml-3 w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </section>

                {/* 2. Offers & Events Banner Slider */}
                {banners.length > 0 && (
                    <section className="pt-8 md:pt-12 pb-16 md:pb-24 bg-[#FAFAFA]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="text-center mb-8 md:mb-10">
                                <p className="text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase text-orange-500 mb-2">Announcements</p>
                                <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Special Offers & Events</h2>
                            </div>
                            <div className="relative rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-white aspect-[21/9] md:aspect-[3/1] border border-gray-100">
                                {banners.map((banner, index) => (
                                    <div 
                                        key={banner.id} 
                                        className={`absolute inset-0 transition-all duration-1000 ${index === currentBannerIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'}`}
                                    >
                                        <a href={banner.link || '#'} onClick={e => !banner.link && e.preventDefault()} className="block w-full h-full">
                                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                        </a>
                                    </div>
                                ))}
                                
                                {banners.length > 1 && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-20 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                                        {banners.map((_, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setCurrentBannerIndex(idx)}
                                                className={`w-2 h-2 rounded-full transition-all ${idx === currentBannerIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* 3. About Us Section (Editorial Style) */}
                <section id="about" className="py-16 md:py-24 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-[#FAFAFA] -z-10 hidden lg:block"></div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-center">
                            <div className="order-2 lg:order-1 relative">
                                <div className="absolute -inset-4 bg-orange-50 rounded-[3rem] transform -rotate-3 -z-10 hidden md:block"></div>
                                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] relative">
                                    <img src="/cafe.png" alt="Vrindavan Cafe" className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000" loading="lazy" />
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <p className="text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase text-orange-500 mb-3 md:mb-4">Our Story</p>
                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.15] md:leading-[1.1] mb-6 md:mb-8">
                                    Tradition meets <br/>modern convenience.
                                </h2>
                                <div className="w-16 md:w-20 h-1 bg-orange-500 mb-6 md:mb-8 rounded-full"></div>
                                <p className="text-base md:text-lg text-gray-500 font-medium mb-4 md:mb-6 leading-relaxed">
                                    Welcome to Vrindavan. We started with a simple vision: to provide wholesome, purely vegetarian meals that taste just like home, delivered right to your doorstep.
                                </p>
                                <p className="text-base md:text-lg text-gray-500 font-medium mb-8 md:mb-10 leading-relaxed">
                                    Our chefs use only the freshest ingredients, preparing every dish with utmost hygiene and devotion. With our subscription system and free home delivery, eating healthy has never been this effortless.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                                    <div className="flex items-center space-x-4 bg-[#FAFAFA] p-4 rounded-2xl border border-gray-100 flex-1">
                                        <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                                        <p className="font-bold text-gray-900 text-xs md:text-sm">Hygienic<br/><span className="text-gray-500 font-medium text-[10px] md:text-xs">Preparation</span></p>
                                    </div>
                                    <div className="flex items-center space-x-4 bg-[#FAFAFA] p-4 rounded-2xl border border-gray-100 flex-1">
                                        <Heart className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
                                        <p className="font-bold text-gray-900 text-xs md:text-sm">Made with<br/><span className="text-gray-500 font-medium text-[10px] md:text-xs">Love</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Customer Reviews Section */}
                {reviews.length > 0 && (
                    <section id="reviews" className="py-16 md:py-24 bg-[#FAFAFA] overflow-hidden relative border-t border-gray-100">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 mb-10 md:mb-16">
                            <p className="text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase text-orange-500 mb-2">Testimonials</p>
                            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">What Our Customers Say</h2>
                        </div>
                        
                        <div className="relative z-10 w-full overflow-hidden flex pb-12">
                            <style>
                                {`
                                @keyframes marquee {
                                    0% { transform: translateX(0); }
                                    100% { transform: translateX(-50%); }
                                }
                                .animate-marquee {
                                    animation: marquee 40s linear infinite;
                                }
                                .animate-marquee:hover {
                                    animation-play-state: paused;
                                }
                                `}
                            </style>
                            <div className="flex animate-marquee whitespace-nowrap min-w-full group">
                                {/* Duplicate reviews array to create seamless loop effect */}
                                {[...reviews, ...reviews, ...reviews].map((review, index) => (
                                    <div 
                                        key={index}
                                        className="inline-flex flex-col w-[300px] md:w-[380px] mx-4 whitespace-normal bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] rounded-3xl p-8 flex-shrink-0 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-50 text-orange-600 rounded-full flex items-center justify-center mr-4 font-black text-lg border border-orange-100/50">
                                                    {review.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm tracking-wide">{review.userName}</h4>
                                                    <div className="flex space-x-1 mt-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <Quote className="w-8 h-8 text-gray-100" />
                                        </div>
                                        <p className="text-base font-medium text-gray-600 leading-relaxed flex-1">"{review.reviewText}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* 5. Gallery Section (Modern Masonry/Grid) */}
                <section id="gallery" className="py-16 md:py-24 bg-white border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12">
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black tracking-[0.2em] uppercase text-orange-500 mb-2">From Our Kitchen</p>
                                <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Gallery</h2>
                            </div>
                            {gallery.length > 8 && (
                                <Link 
                                    to="/gallery" 
                                    className="hidden md:inline-flex items-center space-x-2 text-sm font-bold tracking-wide text-gray-500 hover:text-orange-500 transition-colors"
                                >
                                    <span>View Entire Gallery</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>

                        {gallery.length > 0 ? (
                            <>
                                <div className="columns-2 md:columns-4 gap-1 md:gap-2">
                                    {gallery.slice(0, 8).map((img, i) => (
                                        <div key={img.id} className="mb-1 md:mb-2 relative rounded-2xl overflow-hidden shadow-sm group bg-gray-100 break-inside-avoid">
                                            {img.imageUrl.toLowerCase().endsWith('.mp4') || img.imageUrl.toLowerCase().endsWith('.mov') || img.imageUrl.toLowerCase().endsWith('.webm') ? (
            <video src={img.imageUrl} className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out" autoPlay muted loop playsInline />
        ) : (
            <img src={img.imageUrl} alt="Gallery" className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out" loading="lazy" />
        )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        </div>
                                    ))}
                                </div>
                                {gallery.length > 8 && (
                                    <div className="mt-10 text-center md:hidden">
                                        <Link 
                                            to="/gallery" 
                                            className="inline-flex items-center space-x-2 bg-gray-900 text-white px-8 py-3 rounded-full font-bold text-sm tracking-wide hover:bg-orange-500 hover:shadow-lg transition-all"
                                        >
                                            <span>View More</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-16 bg-[#FAFAFA] rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 font-medium tracking-wide">More photos coming soon...</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-[#FAFAFA] py-16 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-6 md:mb-0 w-full md:w-auto justify-center md:justify-start">
                        <img src="/logo.png" alt="Vrindavan Logo" className="h-16 w-16 object-contain scale-[2] origin-left ml-2 md:ml-4" loading="lazy" />
                    </div>
                    <p className="text-gray-400 text-xs font-medium tracking-wide w-full md:w-auto text-center md:text-right">© {new Date().getFullYear()} Vrindavan. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
