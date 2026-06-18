import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, limit, doc, getDoc, orderBy } from 'firebase/firestore';
import { ArrowRight, Utensils, Star, Flame, ShoppingBag, Plus, Minus, Info, ChevronDown, ChevronUp, Bike, ShieldCheck, Wallet, RefreshCw, CheckCircle, Clock, UtensilsCrossed, ChevronRight, X, CalendarCheck2, Quote, Timer } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import LoginPopup from '../../components/LoginPopup';

const Home = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [mainMenu, setMainMenu] = useState([]);
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [showAllSpecials, setShowAllSpecials] = useState(false);
    const [loading, setLoading] = useState(true);
    const [instantEnabled, setInstantEnabled] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const [showDineInPopup, setShowDineInPopup] = useState(false);
    const [tableNumberInput, setTableNumberInput] = useState('');
    const [minMealPrice, setMinMealPrice] = useState(49);
    const [reviews, setReviews] = useState([]);
    const [gallery, setGallery] = useState([]);
    const reviewsScrollRef = useRef(null);

    const [activeSub, setActiveSub] = useState(null);
    const [plansList, setPlansList] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState('');


    const handleDineInSubmit = () => {
        if (tableNumberInput.trim()) {
            navigate(`/dine-in/${tableNumberInput.trim()}`);
        }
    };

    // Swipe state
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Cart state: { itemId: quantity }
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('guestCart');
            return savedCart ? JSON.parse(savedCart) : {};
        } catch {
            return {};
        }
    });

    // Save cart to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('guestCart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch dynamic banners
                const bannerQ = query(collection(db, 'landingBanners'), where('status', '==', 'active'));
                const bannerSnap = await getDocs(bannerQ);
                const bannerData = [];
                bannerSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                        }
                    }
                    bannerData.push({ id: doc.id, ...data });
                });
                setBanners(bannerData);

                // Fetch plans to compute min price
                const plansQ = query(collection(db, 'subscriptionPlans'), where('status', '==', 'active'));
                const plansSnap = await getDocs(plansQ);
                let minPrice = Infinity;
                const plansData = [];
                plansSnap.forEach(doc => {
                    const plan = { id: doc.id, ...doc.data() };
                    plansData.push(plan);
                    if (plan.price && plan.mealCount) {
                        const pricePerMeal = Math.round(plan.price / plan.mealCount);
                        if (pricePerMeal < minPrice) minPrice = pricePerMeal;
                    }
                });
                setPlansList(plansData);
                if (minPrice !== Infinity) {
                    setMinMealPrice(minPrice);
                }

                if (useAuthStore.getState().user) {
                    const subsQ = query(collection(db, 'subscriptions'), where('userId', '==', useAuthStore.getState().user.uid), where('status', '==', 'active'));
                    const subsSnap = await getDocs(subsQ);
                    if (!subsSnap.empty) {
                        setActiveSub({ id: subsSnap.docs[0].id, ...subsSnap.docs[0].data() });
                    }
                }

                // Fetch Reviews
                const reviewQ = query(collection(db, 'reviews'), where('showOnLanding', '==', true));
                const reviewSnap = await getDocs(reviewQ);
                const reviewData = [];
                reviewSnap.forEach(doc => reviewData.push({ id: doc.id, ...doc.data() }));
                setReviews(reviewData);

                // Fetch Gallery
                const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
                const galleryData = [];
                gallerySnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.trim() !== '') {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                        }
                        galleryData.push({ id: doc.id, ...data });
                    }
                });
                setGallery(galleryData);

                // Fetch categories
                const catQ = query(collection(db, 'categories'), where('status', '==', 'active'));
                const catSnap = await getDocs(catQ);
                const catData = [];
                catSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                        }
                    }
                    catData.push({ id: doc.id, ...data });
                });
                catData.sort((a, b) => {
                    const orderA = (!a.order || a.order === 0) ? 999 : a.order;
                    const orderB = (!b.order || b.order === 0) ? 999 : b.order;
                    return orderA - orderB;
                });
                setCategories(catData);

                // Fetch Main Menu items for Instant Orders
                const menuQ = query(collection(db, 'mainMenu'), where('status', '==', 'active'));
                const menuSnap = await getDocs(menuQ);
                const menuData = [];
                menuSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.imageUrl) {
                        if (data.imageUrl.includes('ngrok-free.app')) {
                            } else if (data.imageUrl.includes('localhost')) {
                            data.imageUrl = data.imageUrl.replace('localhost', window.location.hostname);
                        }
                    }
                    menuData.push({ id: doc.id, ...data });
                });
                setMainMenu(menuData);

                // Fetch global settings for instant orders toggle
                const settingsSnap = await getDoc(doc(db, 'appSettings', 'global'));
                if (settingsSnap.exists()) {
                    setInstantEnabled(settingsSnap.data().instantOrdersEnabled ?? true);
                }

            } catch (error) {
                console.error("Error fetching home data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    // Auto-scroll logic for reviews
    useEffect(() => {
        if (reviews.length === 0) return;
        
        let interval;
        let isPaused = false;

        const startAutoScroll = () => {
            clearInterval(interval);
            interval = setInterval(() => {
                if (reviewsScrollRef.current && !isPaused) {
                    const { scrollLeft, scrollWidth, clientWidth } = reviewsScrollRef.current;
                    // If reached the end, smoothly scroll back to start
                    if (scrollLeft + clientWidth >= scrollWidth - 10) {
                        reviewsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        // Scroll right by approximately one card width
                        reviewsScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
                    }
                }
            }, 3000);
        };

        // Delay starting to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            startAutoScroll();
        }, 1000);

        // Pause scrolling when user interacts (hover/touch)
        const handlePause = () => { isPaused = true; };
        const handleResume = () => { isPaused = false; };

        const currentRef = reviewsScrollRef.current;
        if (currentRef) {
            currentRef.addEventListener('mouseenter', handlePause);
            currentRef.addEventListener('mouseleave', handleResume);
            currentRef.addEventListener('touchstart', handlePause, { passive: true });
            currentRef.addEventListener('touchend', handleResume, { passive: true });
        }

        return () => {
            clearInterval(interval);
            clearTimeout(timeoutId);
            if (currentRef) {
                currentRef.removeEventListener('mouseenter', handlePause);
                currentRef.removeEventListener('mouseleave', handleResume);
                currentRef.removeEventListener('touchstart', handlePause);
                currentRef.removeEventListener('touchend', handleResume);
            }
        };
    }, [reviews]);

    // Slider effect for banners
    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % banners.length);
        }, 3000); // Reduced to 3 seconds
        return () => clearInterval(interval);
    }, [banners, currentBannerIndex]); // Reset interval when current index changes manually

    const handlePrevBanner = () => {
        setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
    };

    const handleNextBanner = () => {
        setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    };

    // Swipe Handlers
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        
        if (isLeftSwipe) {
            handleNextBanner(); // Swipe left means go to next banner
        }
        if (isRightSwipe) {
            handlePrevBanner(); // Swipe right means go to previous banner
        }
    };

    const handleUpdateCart = (itemId, delta) => {
        setCart(prev => {
            const current = prev[itemId] || 0;
            const next = current + delta;
            if (next <= 0) {
                const newCart = { ...prev };
                delete newCart[itemId];
                return newCart;
            }
            return { ...prev, [itemId]: next };
        });
    };

    const getCartTotal = () => {
        let total = 0;
        let count = 0;
        Object.entries(cart).forEach(([itemId, qty]) => {
            const item = mainMenu.find(m => m.id === itemId);
            if (item) {
                total += ((item.price + (item.parcelCharges || 0)) * qty);
                count += qty;
            }
        });
        return { total, count };
    };

    const handleCheckout = () => {
        if (!user) {
            setShowLoginPopup(true);
            return;
        }

        const cartItemsArray = [];
        Object.entries(cart).forEach(([itemId, qty]) => {
            const item = mainMenu.find(m => m.id === itemId);
            if (item) {
                cartItemsArray.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    parcelCharges: item.parcelCharges || 0,
                    image: item.imageUrl || item.image,
                    quantity: qty
                });
            }
        });

        const { total } = getCartTotal();

        navigate('/checkout', {
            state: {
                isInstantOrder: true,
                cartItems: cartItemsArray,
                totalAmount: total
            }
        });
    };

    const { total: cartTotal, count: cartCount } = getCartTotal();

    const todaysSpecials = mainMenu.filter(item => item.isTodaysSpecial);
    const displaySpecials = showAllSpecials ? todaysSpecials : todaysSpecials.slice(0, 4);


    useEffect(() => {
        if (!activeSub || !plansList.length) return;
        const plan = plansList.find(p => p.id === activeSub.planId);
        if (!plan || !plan.cutoffTime) return;

        const updateTimer = () => {
            const match = plan.cutoffTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return;

            let endHour = parseInt(match[1]);
            let endMin = parseInt(match[2]);
            const endPeriod = match[3].toUpperCase();
            if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
            if (endPeriod === 'AM' && endHour === 12) endHour = 0;

            let startHour = 10;
            let startMin = 0;
            const openTimeStr = plan.bookingOpenTime || '10:00 AM';
            const openMatch = openTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (openMatch) {
                startHour = parseInt(openMatch[1]);
                startMin = parseInt(openMatch[2]);
                const startPeriod = openMatch[3].toUpperCase();
                if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
                if (startPeriod === 'AM' && startHour === 12) startHour = 0;
            }

            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const windowStartMins = startHour * 60 + startMin;
            const windowEndMins = endHour * 60 + endMin;

            let isOpen = false;
            if (windowStartMins <= windowEndMins) {
                isOpen = currentMins >= windowStartMins && currentMins <= windowEndMins;
            } else {
                isOpen = currentMins >= windowStartMins || currentMins <= windowEndMins;
            }

            if (!isOpen) {
                setTimeRemaining('Booking closed');
                return;
            }

            let target = new Date();
            target.setHours(endHour, endMin, 0, 0);

            if (now > target) {
                target.setDate(target.getDate() + 1);
            }

            const diff = target - now;
            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeRemaining(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m left`);
            } else {
                setTimeRemaining('Booking closed');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [activeSub, plansList]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-0 pb-24 relative">
            {/* Banner Section */}
            {banners.length > 0 ? (
                <div 
                    className="relative w-full rounded-[2rem] overflow-hidden shadow-lg h-72 md:h-96 bg-gray-900 group"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {banners.map((banner, index) => {
                        const isActive = index === currentBannerIndex;
                        const alignClass = 
                            banner.alignment === 'center' ? 'mx-auto text-center items-center' : 
                            banner.alignment === 'right' ? 'ml-auto text-right items-end' : 
                            'mr-auto text-left items-start';

                        const bgStyle = banner.backgroundType === 'color' 
                            ? { backgroundColor: banner.backgroundColor || '#FF8A00' }
                            : {
                                backgroundImage: banner.imageUrl ? `url(${banner.imageUrl})` : 'linear-gradient(to right, #f97316, #ef4444)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            };

                        const hasPos = banner.headingPos !== undefined;

                        return (
                            <div 
                                key={banner.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                style={bgStyle}
                            >
                                {banner.backgroundType !== 'color' && (
                                    <div 
                                        className="absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none" 
                                        style={{ opacity: (banner.overlayOpacity ?? 40) / 100 }}
                                    ></div>
                                )}
                                
                                {hasPos ? (
                                    <div className={`absolute inset-0 transition-all duration-1000 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                        <div 
                                            className="absolute"
                                            style={{ 
                                                left: `${banner.headingPos?.x || 10}%`, 
                                                top: `${banner.headingPos?.y || 30}%`,
                                                transform: 'translate(0, -50%)',
                                                color: banner.headingColor || '#FFFFFF'
                                            }}
                                        >
                                            {banner.heading && (
                                                <h1 className={`font-bold leading-tight whitespace-pre-line ${banner.headingSize || 'text-2xl md:text-5xl'} ${banner.headingFont || 'font-sans'}`}>
                                                    {banner.heading}
                                                </h1>
                                            )}
                                        </div>

                                        <div 
                                            className="absolute"
                                            style={{ 
                                                left: `${banner.subheadingPos?.x || 10}%`, 
                                                top: `${banner.subheadingPos?.y || 50}%`,
                                                transform: 'translate(0, -50%)',
                                                color: banner.subheadingColor || 'rgba(255,255,255,0.9)'
                                            }}
                                        >
                                            {banner.subheading && (
                                                <p className={`whitespace-pre-line ${banner.subheadingSize || 'text-xs md:text-base'} ${banner.subheadingFont || 'font-sans'}`}>
                                                    {banner.subheading}
                                                </p>
                                            )}
                                        </div>

                                        {banner.buttonText && (
                                            <div 
                                                className="absolute"
                                                style={{ 
                                                    left: `${banner.buttonPos?.x || 10}%`, 
                                                    top: `${banner.buttonPos?.y || 70}%`,
                                                    transform: 'translate(0, -50%)'
                                                }}
                                            >
                                                <Link 
                                                    to={banner.buttonLink || '#'} 
                                                    className={`inline-flex items-center rounded-full font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 ${banner.buttonSize || 'px-4 py-2 md:px-6 md:py-3 text-xs md:text-sm'} ${banner.buttonFont || 'font-sans'}`}
                                                    style={{ backgroundColor: banner.buttonColor || '#FFFFFF', color: banner.buttonTextColor || '#EA580C' }}
                                                >
                                                    {banner.buttonText} <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Legacy support */
                                    <div className="absolute inset-0 p-6 pb-6 md:p-10 md:pt-28 flex flex-col justify-end md:justify-center">
                                        <div className={`relative z-10 w-full max-w-xl flex flex-col ${alignClass} transform transition-transform duration-1000 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                            {banner.heading && (
                                                <h1 className="text-2xl md:text-5xl font-bold leading-tight mb-2 md:mb-4 whitespace-pre-line" style={{ color: banner.headingColor || '#FFFFFF' }}>
                                                    {banner.heading}
                                                </h1>
                                            )}
                                            {banner.subheading && (
                                                <p className="mb-4 md:mb-6 text-xs md:text-base whitespace-pre-line" style={{ color: banner.subheadingColor || 'rgba(255,255,255,0.9)' }}>
                                                    {banner.subheading}
                                                </p>
                                            )}
                                            {banner.buttonText && (
                                                <Link 
                                                    to={banner.buttonLink || '#'} 
                                                    className="inline-flex items-center bg-white text-orange-600 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-xs md:text-sm hover:bg-gray-50 transition-colors shadow-sm w-fit"
                                                >
                                                    {banner.buttonText} <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Dots indicator */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center space-x-2">
                            {banners.map((_, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setCurrentBannerIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <section className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-6 md:p-10 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-md">
                        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">Healthy Meals,<br/>Delivered Daily.</h1>
                        <p className="text-white/90 mb-6 text-sm md:text-base">Subscribe to our meal plans and never worry about cooking again. Fresh, hot, and hygienic.</p>
                        <Link to="/plans" className="inline-flex items-center bg-white text-orange-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                            View Subscriptions <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </div>
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
                </section>
            )}


            {/* Subscriptions Promotional Banner */}
            <section className="px-4 md:px-0 mt-6 md:mt-10">
                <div 
                    className="w-full relative flex flex-col md:flex-row items-center rounded-2xl md:rounded-[24px] shadow-sm border border-orange-100/50 overflow-visible min-h-[80px] md:min-h-[240px] py-2 md:py-0"
                    style={{ background: 'linear-gradient(135deg, #FFF8F1 0%, #FFF4E8 40%, #FFF0E0 100%)' }}
                >
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-orange-400/10 blur-2xl rounded-full scale-110 -z-10"></div>

                    {/* =========================================
                        MOBILE ONLY LAYOUT
                    ========================================= */}
                    
                    
                    {/* MOBILE ONLY LAYOUT */}
                    <div className="flex md:hidden flex-col items-center justify-center text-center w-full px-2 mb-1">
                        <h2 className="text-[26px] sm:text-[30px] font-black leading-[1.1] text-[#2D1A12] mb-0 tracking-tight">
                            <>Breakfast <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-[#FF8A00]">Subscriptions</span></>
                        </h2>
                    </div>

                    
                    <div className="flex md:hidden flex-row w-full items-center justify-between mb-2 px-2">
                        <div className="w-[48%] shrink-0 flex flex-col items-center justify-center -ml-2 relative">
                            <img 
                                src="/bowl.png" 
                                alt="Premium Daily Meal" 
                                className="w-44 sm:w-56 object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-500"
                            />
                            <div className="mt-1 bg-white border border-orange-200 shadow-sm rounded-full py-1 px-3 text-center transform -rotate-2">
                                {activeSub ? (
                                    <>
                                        <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest block leading-none mb-0.5">{activeSub.planName}</span>
                                        <span className="text-[18px] font-black text-[#FF6B00] leading-none">{activeSub.remainingMeals} Days Left</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest block leading-none mb-0.5">Starting at just</span>
                                        <span className="text-[18px] font-black text-[#FF6B00] leading-none">₹{minMealPrice}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 pl-2 w-[52%]">
                            {!activeSub ? (
                                <>
                                    <div className="flex flex-col items-start text-left group">
                                        <div className="flex flex-row items-center mb-0.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mr-1.5 shadow-sm shrink-0">
                                                <Clock className="w-2.5 h-2.5 text-[#FF6B00]" />
                                            </div>
                                            <h4 className="text-[10px] sm:text-[12px] font-extrabold text-gray-900 leading-tight">Plan Ahead</h4>
                                        </div>
                                        <p className="text-[8px] sm:text-[10px] font-semibold text-gray-600 leading-tight ml-6.5">Select tomorrow's breakfast at night</p>
                                    </div>
                                    <div className="flex flex-col items-start text-left group">
                                        <div className="flex flex-row items-center mb-0.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mr-1.5 shadow-sm shrink-0">
                                                <Flame className="w-2.5 h-2.5 text-[#FF6B00]" />
                                            </div>
                                            <h4 className="text-[10px] sm:text-[12px] font-extrabold text-gray-900 leading-tight">Flexible</h4>
                                        </div>
                                        <p className="text-[8px] sm:text-[10px] font-semibold text-gray-600 leading-tight ml-6.5">Pause subscription when traveling to save days.</p>
                                    </div>
                                    <div className="flex flex-col items-start text-left group">
                                        <div className="flex flex-row items-center mb-0.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mr-1.5 shadow-sm shrink-0">
                                                <Bike className="w-2.5 h-2.5 text-[#FF6B00]" />
                                            </div>
                                            <h4 className="text-[10px] sm:text-[12px] font-extrabold text-gray-900 leading-tight">On-Time Delivery</h4>
                                        </div>
                                        <p className="text-[8px] sm:text-[10px] font-semibold text-gray-600 leading-tight ml-6.5">Fresh hot breakfast delivered daily by morning.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex items-center text-[#2D1A12]">
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                        <span className="text-sm font-bold">{activeSub.planName}</span>
                                    </div>
                                    <div className="flex items-center text-[#2D1A12]">
                                        <CalendarCheck2 className="w-4 h-4 text-[#FF6B00] mr-2" />
                                        <span className="text-sm font-bold">{activeSub.remainingMeals} Days Remaining</span>
                                    </div>
                                    <div className="flex items-center text-[#2D1A12]">
                                        <ShieldCheck className="w-4 h-4 text-green-500 mr-2" />
                                        <span className="text-sm font-bold text-gray-600">Active</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeSub && (
                        <div className="flex md:hidden justify-center items-center w-full px-4 mb-2">
                            <div className="w-full bg-white rounded-xl p-3 border border-orange-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-20">
                                    <Timer className="w-12 h-12 text-[#FF6B00]" />
                                </div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1 z-10">Time remaining to book tomorrow's meal</span>
                                {timeRemaining === 'Booking closed' ? (
                                    <span className="text-xl font-black text-red-500 z-10">Closed</span>
                                ) : (
                                    <span className="text-xl font-black text-[#FF6B00] z-10">{timeRemaining}</span>
                                )}
                            </div>
                        </div>
                    )}
<div className="flex md:hidden justify-center items-center w-full pb-4">
                        <Link 
                            to="/plans" 
                            className="group relative flex items-center justify-center w-[85%] sm:w-2/3 py-2 rounded-lg font-bold text-[16px] text-white shadow-lg shadow-[#FF6B00]/40 transition-all active:translate-y-0"
                            style={{ background: 'linear-gradient(90deg, #FF6B00, #FF8A00)' }}
                        >
                            <span className="relative z-10 flex items-center whitespace-nowrap">
                                {activeSub ? 'Book Meal' : 'View Plans'} <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </div>



                    {/* =========================================
                        DESKTOP ONLY LAYOUT
                    ========================================= */}

                    {/* DESKTOP ONLY: Left Section (Visual - Absolute Overflow) */}
                    <div className="hidden md:block absolute -left-20 -bottom-10 z-20 pointer-events-none">
                        <img 
                            src="/bowl.png" 
                            alt="Premium Daily Meal" 
                            className="w-80 xl:w-[28rem] object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-500 pointer-events-auto"
                        />
                    </div>

                    {/* DESKTOP ONLY: Spacer for absolute image */}
                    <div className="hidden md:block md:w-64 xl:w-72 shrink-0"></div>

                    
                    {/* DESKTOP ONLY: Center Section (Marketing) */}
                    <div className="hidden md:flex flex-1 py-8 pl-8 pr-4 flex-col justify-center text-left z-10">
                        <h2 className="text-[36px] font-black leading-[1.1] text-[#2D1A12] mb-6 tracking-tight">
                            <>Breakfast <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] to-[#FF8A00]">Subscriptions</span></>
                        </h2>

                        
                        <div className="flex flex-row justify-start gap-8 mt-1">
                            {!activeSub ? (
                                <>
                                    <div className="flex flex-col items-center text-center group max-w-[150px]">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2 shadow-sm">
                                            <Clock className="w-6 h-6 text-[#FF6B00]" />
                                        </div>
                                        <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight mb-1">Plan Ahead</h4>
                                        <p className="text-[11px] font-semibold text-gray-600 leading-tight">Select tomorrow's breakfast at night</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center group max-w-[150px]">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2 shadow-sm">
                                            <Flame className="w-6 h-6 text-[#FF6B00]" />
                                        </div>
                                        <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight mb-1">Flexible</h4>
                                        <p className="text-[11px] font-semibold text-gray-600 leading-tight">Pause subscription when traveling to save days.</p>
                                    </div>
                                    <div className="flex flex-col items-center text-center group max-w-[150px]">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2 shadow-sm">
                                            <Bike className="w-6 h-6 text-[#FF6B00]" />
                                        </div>
                                        <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight mb-1">On-Time Delivery</h4>
                                        <p className="text-[11px] font-semibold text-gray-600 leading-tight">Fresh hot breakfast delivered daily by morning.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-row gap-8 pt-2">
                                    <div className="flex flex-col items-center text-center group max-w-[150px]">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2 shadow-sm">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight mb-1">{activeSub.planName}</h4>
                                    </div>
                                    <div className="flex flex-col items-center text-center group max-w-[150px]">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2 shadow-sm">
                                            <CalendarCheck2 className="w-6 h-6 text-[#FF6B00]" />
                                        </div>
                                        <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight mb-1">{activeSub.remainingMeals} Days Left</h4>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DESKTOP ONLY: Right Section (CTA Button only - Desktop) */}
                    <div className="hidden md:flex flex-col md:w-72 p-8 shrink-0 items-center justify-center z-10 relative">
                        {activeSub && (
                            <div className="w-full bg-white rounded-2xl p-4 border border-orange-200 shadow-md mb-4 flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 p-1 opacity-10">
                                    <Timer className="w-24 h-24 text-[#FF6B00]" />
                                </div>
                                <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider mb-2 z-10 text-center">Time remaining for tomorrow</span>
                                {timeRemaining === 'Booking closed' ? (
                                    <span className="text-2xl font-black text-red-500 z-10">Closed</span>
                                ) : (
                                    <span className="text-2xl font-black text-[#FF6B00] z-10">{timeRemaining}</span>
                                )}
                            </div>
                        )}
                        <Link 
                            to="/plans" 
                            className="group relative flex items-center justify-center w-full py-4 rounded-2xl font-bold text-[16px] text-white overflow-hidden shadow-lg shadow-[#FF6B00]/40 transition-all hover:shadow-[#FF6B00]/50 hover:-translate-y-0.5 active:translate-y-0"
                            style={{ background: 'linear-gradient(90deg, #FF6B00, #FF8A00)' }}
                        >
                            <span className="relative z-10 flex items-center whitespace-nowrap">
                                {activeSub ? 'Book Meal' : 'View Plans'} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </div>
</div>
            </section>

            {/* Instant Orders Menu */}
            <section>
                <div className="flex flex-col items-center mb-8 relative z-0">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent -z-10 -translate-y-1/2"></div>
                    
                    <h2 className="text-lg md:text-xl font-black text-orange-900 flex items-center tracking-tight bg-orange-50 border border-orange-100 px-8 py-3 rounded-full shadow-sm">
                        <Utensils className="h-5 w-5 md:h-6 md:w-6 text-orange-500 mr-2" /> Order Now
                    </h2>
                    
                    {!instantEnabled && (
                        <span className="mt-3 text-xs font-bold text-red-600 bg-white border border-red-200 shadow-sm px-4 py-1.5 rounded-full flex items-center">
                            <Info className="w-3.5 h-3.5 mr-1.5" /> Currently Closed
                        </span>
                    )}
                </div>

                {/* Categories Zomato-style Scroller */}
                {categories && categories.length > 0 && (
                    <>
                        <div className="px-4 md:px-0">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                                What's on your mind?
                            </h3>
                        </div>
                        <div className="flex overflow-x-auto gap-2 md:gap-4 px-4 md:px-0 mb-8 pb-4 hide-scrollbar snap-x">
                        {categories.map((cat) => (
                            <div 
                                key={cat.id} 
                                className="flex flex-col items-center shrink-0 cursor-pointer group snap-start"
                                onClick={() => {
                                    const el = document.getElementById(`category-${cat.name.replace(/\s+/g, '-')}`);
                                    if (el) {
                                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                        window.scrollTo({ top: y, behavior: 'smooth' });
                                    }
                                }}
                            >
                                <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 transition-all flex items-center justify-center">
                                    {cat.imageUrl || cat.image ? (
                                        <img 
                                            src={(cat.imageUrl || cat.image).replace('localhost', window.location.hostname)} 
                                            alt={cat.name} 
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Utensils className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <span className="-mt-3 text-[13px] sm:text-[14px] md:text-base font-bold text-gray-700 text-center w-32 sm:w-36 md:w-40 truncate">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                    </>
                )}
                <div className="mt-2 mb-8 flex justify-center px-4">
                    <Link 
                        to="/menu"
                        className="w-full md:w-auto flex items-center justify-center bg-[#FF8A00] text-white font-black py-4 px-8 rounded-2xl hover:bg-[#E67C00] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/30 tracking-wide"
                    >
                        View Full Menu <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>

                {/* Today's Specials Vertical List */}
                {todaysSpecials.length > 0 && (
                    <div className="mt-8 mb-8">
                        <div className="px-4 md:px-0 flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-gray-900 flex items-center">
                                <Star className="w-5 h-5 text-amber-500 mr-2 fill-amber-500" /> Today's Special
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-0">
                            {displaySpecials.map((item, index) => (
                                <div key={item.id} className={`bg-white border border-orange-100 rounded-3xl p-4 shadow-sm space-x-4 hover:shadow-md transition-shadow relative ${!showAllSpecials && index === 3 ? 'hidden md:flex' : 'flex'}`}>
                                    <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-gray-100 relative shadow-sm">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Utensils className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between pt-1">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight tracking-tight">{item.name}</h3>
                                                <span className="flex items-center px-2.5 py-0.5 bg-[#FF8A00] text-white rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                                                    <Star 
                                                        className="w-3 h-3 text-yellow-200 fill-yellow-300 mr-1 drop-shadow-[0_0_3px_rgba(253,224,71,0.9)] animate-pulse" 
                                                        style={{ animationDuration: '1s' }}
                                                    /> SPECIAL
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center space-x-3 mb-2">
                                                {item.totalRatings > 0 && (
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="w-3.5 h-3.5 text-[#FF8A00] fill-[#FF8A00]" />
                                                        <span className="text-xs font-bold text-[#FF8A00]">{Number(item.averageRating).toFixed(1)}</span>
                                                        <span className="text-[10px] font-bold text-gray-400">({item.totalRatings})</span>
                                                    </div>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                                    item.foodType === 'non-veg' ? 'bg-red-50 text-red-700' : 
                                                    item.foodType === 'egg' ? 'bg-yellow-50 text-yellow-700' : 
                                                    'bg-green-50 text-green-700'
                                                }`}>
                                                    {item.foodType || 'veg'}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-3">
                                            <span className="font-black text-gray-900 text-xl tracking-tight">₹{item.price}</span>
                                            
                                            {!instantEnabled ? (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 font-bold rounded-xl text-xs uppercase tracking-wider border border-gray-200">Closed</span>
                                            ) : cart[item.id] ? (
                                                <div className="flex items-center space-x-3 bg-gray-100 rounded-xl p-1 border border-gray-200 h-8">
                                                    <button onClick={() => handleUpdateCart(item.id, -1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm text-red-500">
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="font-bold text-sm w-4 text-center">{cart[item.id]}</span>
                                                    <button onClick={() => handleUpdateCart(item.id, 1)} className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm text-green-500">
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleUpdateCart(item.id, 1)}
                                                    className="bg-[#FF8A00] text-white px-5 py-1.5 rounded-xl text-xs font-black tracking-widest hover:bg-[#E67C00] transition-colors shadow-md shadow-orange-500/20"
                                                >
                                                    ADD
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {todaysSpecials.length > 4 && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={() => setShowAllSpecials(!showAllSpecials)}
                                    className="flex items-center text-gray-500 font-bold text-sm hover:text-orange-600 transition-colors py-2 px-4 rounded-xl hover:bg-orange-50"
                                >
                                    {showAllSpecials ? (
                                        <>View Less <ChevronUp className="w-4 h-4 ml-1" /></>
                                    ) : (
                                        <>View More <ChevronDown className="w-4 h-4 ml-1" /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Explore More Section */}
                <div className="mt-8 mb-8 px-4 md:px-0 max-w-full">
                    <h3 className="text-xl font-black text-gray-900 flex items-center justify-center mb-6">
                        <Utensils className="w-5 h-5 text-amber-500 mr-2" /> Explore More
                    </h3>
                    <div className="flex overflow-x-auto justify-center gap-4 sm:gap-8 md:gap-16 lg:gap-24 pb-4 hide-scrollbar snap-x">
                        {/* Dine In Card */}
                        <div 
                            onClick={() => setShowDineInPopup(true)}
                            className="flex flex-col items-center shrink-0 cursor-pointer group snap-start"
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transition-all flex items-center justify-center mb-2">
                                <img src="/dine-in-card.png" alt="Dine In" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                            </div>
                            <h4 className="text-[13px] sm:text-sm md:text-base font-bold text-gray-800 text-center tracking-tight">Dine In</h4>
                        </div>
                        
                        {/* Catering Card */}
                        <div 
                            onClick={() => navigate('/catering')}
                            className="flex flex-col items-center shrink-0 cursor-pointer group snap-start"
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transition-all flex items-center justify-center mb-2">
                                <img src="/catering-card.png" alt="Catering" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                            </div>
                            <h4 className="text-[13px] sm:text-sm md:text-base font-bold text-gray-800 text-center tracking-tight">Catering</h4>
                        </div>

                        {/* Book Event Card */}
                        <div 
                            onClick={() => navigate('/events')}
                            className="flex flex-col items-center shrink-0 cursor-pointer group snap-start"
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transition-all flex items-center justify-center mb-2">
                                <img src="/events-card.png" alt="Book Event" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                            </div>
                            <h4 className="text-[13px] sm:text-sm md:text-base font-bold text-gray-800 text-center tracking-tight">Book Event</h4>
                        </div>

                        {/* Rewards Card */}
                        <div 
                            onClick={() => {
                                if (user) {
                                    navigate('/rewards');
                                } else {
                                    setShowLoginPopup(true);
                                }
                            }}
                            className="flex flex-col items-center shrink-0 cursor-pointer group snap-start"
                        >
                            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transition-all flex items-center justify-center mb-2">
                                <img src="/rewards-card.png" alt="Rewards" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                            </div>
                            <h4 className="text-[13px] sm:text-sm md:text-base font-bold text-gray-800 text-center tracking-tight">Rewards</h4>
                        </div>
                    </div>
                </div>
            </section>

            {/* Customer Reviews Section */}
            {reviews.length > 0 && (
                <section className="pt-12 pb-0 bg-[#FAFAFA] relative border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 md:px-0 mb-6 flex items-center justify-between">
                        <h3 className="text-xl font-black text-gray-900 flex items-center">
                            <Star className="w-5 h-5 text-yellow-500 mr-2" /> What Our Customers Say
                        </h3>
                        <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                            {reviews.length} Reviews
                        </div>
                    </div>
                    
                    <div className="w-full">
                        <div 
                            ref={reviewsScrollRef}
                            className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar px-4 pb-6 scroll-smooth"
                        >
                            {reviews.map((review, index) => (
                                <div 
                                    key={index}
                                    className="shrink-0 w-[80vw] sm:w-[350px] snap-start bg-white shadow-sm border border-gray-100 rounded-3xl p-6 flex flex-col transition-shadow hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-50 text-orange-600 rounded-full flex items-center justify-center mr-3 font-black text-base border border-orange-100/50">
                                                {review.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm tracking-wide">{review.userName}</h4>
                                                <div className="flex space-x-1 mt-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <Quote className="w-6 h-6 text-gray-100" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600 leading-relaxed flex-1">"{review.reviewText}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Gallery Section */}
            {gallery.length > 0 && (
                <section className="pt-0 pb-12 bg-transparent overflow-hidden relative">
                    <div className="max-w-7xl mx-auto px-4 md:px-0 mb-6 flex justify-between items-end">
                        <h3 className="text-xl font-black text-gray-900 flex items-center">
                            From Our Kitchen
                        </h3>
                        {gallery.length > 4 && (
                            <Link to="/gallery" className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center">
                                View All <ChevronRight className="w-4 h-4 ml-0.5" />
                            </Link>
                        )}
                    </div>
                    
                    <div className="max-w-7xl mx-auto px-4 md:px-0">
                        <div className="columns-2 md:columns-4 gap-1 md:gap-2">
                            {gallery.map((img, i) => (
                                <div key={img.id} className="mb-1 md:mb-2 relative rounded-2xl overflow-hidden shadow-sm group bg-gray-100 break-inside-avoid">
                                    <img 
                                        src={img.imageUrl} 
                                        alt="Gallery" 
                                        className="w-full h-auto object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out" 
                                        onError={(e) => { e.target.closest('.group').style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="mt-8 pt-8 pb-12 px-4 md:px-0 text-center border-t border-gray-100">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-gray-500 mb-6">
                    <Link to="/about" className="hover:text-orange-500 transition-colors">About Us</Link>
                    <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link>
                    <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms & Conditions</Link>
                    <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link>
                    <Link to="/refund" className="hover:text-orange-500 transition-colors">Refund Policy</Link>
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                    <div className="w-8 h-px bg-gray-200"></div>
                    <Utensils className="w-4 h-4 text-gray-300" />
                    <div className="w-8 h-px bg-gray-200"></div>
                </div>
                <p className="text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Vrindavan. All rights reserved.
                </p>
            </footer>

            {/* Sticky Cart Footer */}
            {cartCount > 0 && (
                <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black text-white rounded-2xl shadow-2xl p-4 flex justify-between items-center z-50 animate-in slide-in-from-bottom-5">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-300 font-medium">{cartCount} Item{cartCount > 1 ? 's' : ''}</p>
                            <p className="font-bold text-lg leading-none">₹{cartTotal}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-colors"
                    >
                        Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            )}

            <LoginPopup 
                isOpen={showLoginPopup} 
                onClose={() => setShowLoginPopup(false)} 
                message="Please login or create an account to place your order." 
            />

            {/* Dine-In Table Number Popup */}
            {showDineInPopup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 flex items-center">
                                <UtensilsCrossed className="w-5 h-5 text-orange-500 mr-2" /> Dine In
                            </h3>
                            <button onClick={() => setShowDineInPopup(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-5 text-center">Please enter your table number to view the menu and place your order.</p>
                            <input
                                type="text"
                                placeholder="e.g. 5"
                                value={tableNumberInput}
                                onChange={(e) => setTableNumberInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleDineInSubmit();
                                }}
                                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-xl font-black text-center mb-6 shadow-inner text-gray-900"
                                autoFocus
                            />
                            <button
                                onClick={handleDineInSubmit}
                                disabled={!tableNumberInput.trim()}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.98]"
                            >
                                Proceed to Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
