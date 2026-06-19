import SEO from '../../components/SEO';
import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Heart, Leaf, Utensils, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AboutUs = () => {
    const navigate = useNavigate();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="pb-24 font-sans bg-white min-h-screen">
            <SEO 
                title="About Vrindavan Resto Cafe" 
                description="Learn about our journey to bring the best vegetarian culinary experience to Solladevanahalli."
                canonical="/about"
                keywords="About Vrindavan Resto Cafe, Best Vegetarian Restaurant Near Me"
            />
            {/* Header Area */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">About Us</h1>
                </div>
                <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" loading="lazy" />
            </div>

            {/* Hero Image Section */}
            <div className="relative w-full h-[35vh] md:h-[45vh] bg-gray-900 overflow-hidden">
                <img 
                    src="/cafe.png" 
                    alt="Vrindavan Cafe" 
                    className="w-full h-full object-cover opacity-60 hover:scale-105 transition-transform duration-1000"
                loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                    <p className="text-orange-400 font-bold tracking-[0.2em] uppercase text-xs mb-2">Our Story</p>
                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                        Tradition meets <br/> modern culinary art.
                    </h2>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
                {/* Introduction Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-200/50 border border-gray-100 mb-8">
                    <div className="flex items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 mr-4 shrink-0">
                            <Utensils className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Welcome to Vrindavan</h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed font-medium">
                                We started with a simple vision: to provide wholesome, purely vegetarian meals that taste just like home. Today, Vrindavan is synonymous with hygiene, taste, and tradition.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Values Section */}
                <h3 className="text-lg font-black text-gray-900 mb-4 px-2">Why Choose Us?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-5 flex items-center group cursor-pointer hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-500 mr-4 shadow-sm group-hover:scale-110 transition-transform">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">100% Pure Veg</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Authentic sattvic recipes.</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-5 flex items-center group cursor-pointer hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 mr-4 shadow-sm group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Highest Hygiene</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Strict quality & cleanliness standards.</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-2xl p-5 flex items-center group cursor-pointer hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 mr-4 shadow-sm group-hover:scale-110 transition-transform">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Made With Love</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Every meal feels like home.</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl p-5 flex items-center group cursor-pointer hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 mr-4 shadow-sm group-hover:scale-110 transition-transform">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">Premium Quality</h4>
                            <p className="text-xs text-gray-600 mt-0.5">Only the best ingredients used.</p>
                        </div>
                    </div>
                </div>

                {/* Secondary Image & Text */}
                <div className="rounded-3xl overflow-hidden mb-8 shadow-sm">
                    <div className="bg-gray-900 p-8 md:p-12 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500 rounded-full blur-[100px] opacity-20"></div>
                        
                        <h2 className="text-2xl md:text-3xl font-black mb-4 relative z-10">Experience the Magic</h2>
                        <p className="text-gray-300 text-sm md:text-base font-medium max-w-lg mx-auto leading-relaxed relative z-10">
                            Whether you are dining in, ordering a subscription, or catering an event, we ensure every bite delivers unparalleled satisfaction and authenticity.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
