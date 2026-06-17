import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import useAuthStore from '../../store/useAuthStore';
import { ShoppingBag, Clock, CheckCircle, Package, Phone, Star, ChevronRight, ChevronDown, User, Upload, X, Gift } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';
import { uploadImage } from '../../utils/uploadImage';

const Orders = () => {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [menuMap, setMenuMap] = useState({});

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewOrder, setReviewOrder] = useState(null);
    const [reviewItem, setReviewItem] = useState(null);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [reviewPhotos, setReviewPhotos] = useState([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [instantSnap, bookingSnap, subMenuSnap, mainMenuSnap] = await Promise.all([
                    getDocs(query(collection(db, 'instantOrders'), where('userId', '==', user.uid))),
                    getDocs(query(collection(db, 'subscriptionBookings'), where('userId', '==', user.uid))),
                    getDocs(collection(db, 'subscriptionMenu')),
                    getDocs(collection(db, 'mainMenu'))
                ]);
                
                const map = {};
                subMenuSnap.forEach(d => {
                    const data = d.data();
                    map[d.id] = { name: data.name, image: data.imageUrl || data.image };
                });
                mainMenuSnap.forEach(d => {
                    const data = d.data();
                    map[d.id] = { name: data.name, image: data.imageUrl || data.image };
                });
                setMenuMap(map);

                const deliveryBoyIds = new Set();
                instantSnap.forEach(d => {
                    const data = d.data();
                    if (data.deliveryBoyId) deliveryBoyIds.add(data.deliveryBoyId);
                });
                bookingSnap.forEach(d => {
                    const data = d.data();
                    if (data.deliveryBoyId) deliveryBoyIds.add(data.deliveryBoyId);
                });

                const deliveryBoysCache = {};
                for (const dId of deliveryBoyIds) {
                    try {
                        const uSnap = await getDoc(doc(db, 'users', dId));
                        if (uSnap.exists()) deliveryBoysCache[dId] = uSnap.data();
                    } catch (err) {
                        console.warn(`Could not fetch delivery boy ${dId}`, err);
                    }
                }

                const data = [];
                instantSnap.forEach(d => {
                    const oData = d.data();
                    data.push({ id: d.id, type: 'Instant', ...oData, deliveryBoyData: deliveryBoysCache[oData.deliveryBoyId] });
                });
                bookingSnap.forEach(d => {
                    const bData = d.data();
                    const menuItemsWithNames = (bData.menuItems || []).map(id => ({
                        id,
                        name: map[id]?.name || 'Unknown Item',
                        image: map[id]?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'
                    }));
                    data.push({ id: d.id, type: 'Subscription', ...bData, menuItems: menuItemsWithNames, deliveryBoyData: deliveryBoysCache[bData.deliveryBoyId] });
                });

                setOrders(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
            } catch (error) {
                console.error("Error fetching orders", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user]);

    const getStatusUI = (status) => {
        switch(status) {
            case 'pending': return { icon: <Clock className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'assigned': return { icon: <Package className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'delivered': return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-50' };
            default: return { icon: <Clock className="h-4 w-4" />, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    const handleOpenReview = (order) => {
        setReviewOrder(order);
        let itemsList = [];
        if (order.type === 'Subscription' && order.menuItems?.length > 0) {
            itemsList = order.menuItems;
        } else if (order.items?.length > 0) {
            itemsList = order.items;
        }
        
        const unratedItems = itemsList.filter(i => !(order.reviewedItems || []).includes(i.id));
        
        setReviewItem(unratedItems[0] || null);
        setRating(5);
        setReviewText('');
        setReviewPhotos([]);
        setReviewModalOpen(true);
    };

    const handlePhotoChange = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).slice(0, 3); // Max 3 photos
            setReviewPhotos(files);
        }
    };

    const submitReview = async () => {
        if (!reviewItem || rating < 1) return;
        setIsSubmittingReview(true);
        try {
            // Upload photos if any
            const photoUrls = [];
            for (const file of reviewPhotos) {
                try {
                    const url = await uploadImage(file, 'reviews');
                    if (url) photoUrls.push(url);
                } catch (imgErr) {
                    console.warn("Failed to upload an image. Storage might not be enabled. Skipping this image.");
                    alert("Warning: Could not upload the photo. Your Firebase Storage rules might be blocking it or Storage is not initialized.");
                }
            }

            // Create a timeout promise for Firestore operations
            const firestoreTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Firestore operation timed out.")), 15000);
            });

            // Save review doc
            const reviewDoc = {
                userId: user.uid,
                userName: user.displayName || user.email?.split('@')[0] || 'User',
                orderId: reviewOrder.id,
                itemId: reviewItem.id,
                itemName: reviewItem.name,
                rating,
                reviewText,
                photos: photoUrls,
                createdAt: new Date().toISOString()
            };
            
            const firestoreOp = async () => {
                await addDoc(collection(db, 'reviews'), reviewDoc);

                // Update order's reviewedItems
                const orderCol = reviewOrder.type === 'Subscription' ? 'subscriptionBookings' : 'instantOrders';
                const orderRef = doc(db, orderCol, reviewOrder.id);
                const updatedReviewedItems = [...(reviewOrder.reviewedItems || []), reviewItem.id];
                await updateDoc(orderRef, { reviewedItems: updatedReviewedItems });
                
                // Update local orders state
                setOrders(prev => prev.map(o => o.id === reviewOrder.id ? { ...o, reviewedItems: updatedReviewedItems } : o));

                // Update main menu average rating if it's an instant order item
                const menuRef = doc(db, 'mainMenu', reviewItem.id);
                const menuSnap = await getDoc(menuRef);
                if (menuSnap.exists()) {
                    const data = menuSnap.data();
                    const currentTotal = data.totalRatings || 0;
                    const currentAvg = data.averageRating || 0;
                    
                    const newTotal = currentTotal + 1;
                    const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;
                    
                    await updateDoc(menuRef, {
                        averageRating: newAvg,
                        totalRatings: newTotal
                    });
                }
            };

            await Promise.race([firestoreOp(), firestoreTimeout]);

            alert("Review submitted successfully!");
            setReviewModalOpen(false);
        } catch (error) {
            console.error("Error submitting review", error);
            alert(`Failed to submit review: ${error.message}`);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading your delicious orders...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 mb-20">
            <h1 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Your Orders</h1>

            <div className="space-y-6">
                {orders.map(order => {
                    const statusUI = getStatusUI(order.status);
                    const isExpanded = expandedOrderId === order.id;
                    const totalAmt = order.totalAmount || 0;
                    // For subscription addons, totalAmount isn't directly on the doc, we can calculate it
                    let displayTotal = totalAmt;
                    if (order.type === 'Subscription' && order.addOnItems) {
                        displayTotal = order.addOnItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    }

                    return (
                        <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
                            {/* Header (Always Visible) */}
                            <div 
                                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-black text-white p-2.5 rounded-xl">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Order #{generateNumericId(order.id)}</h3>
                                            <p className="text-xs text-gray-500 font-medium">
                                                {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${statusUI.bg} ${statusUI.color}`}>
                                        {statusUI.icon}
                                        <span>{order.status}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-2">
                                            {order.type}
                                        </span>
                                        {order.type === 'Subscription' ? (
                                            <p className="text-sm font-medium text-gray-800">For {new Date(order.date).toLocaleDateString()}</p>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-800">{order.items?.length || 0} Items</p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {displayTotal > 0 && <span className="font-black text-lg text-gray-900">₹{Number(displayTotal).toFixed(2)}</span>}
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Detailed View */}
                            {isExpanded && (
                                <div className="px-5 pb-6 border-t border-gray-100 bg-gray-50/30">
                                    {/* Order Items */}
                                    <div className="pt-5 space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Order Details</h4>
                                        
                                        {order.type === 'Subscription' ? (
                                            <div className="space-y-4">
                                                {/* Meal Items */}
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 mb-3">Meal Items</p>
                                                    <div className="space-y-3">
                                                        {order.menuItems?.map((item, i) => (
                                                            <div key={i} className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="relative w-12 h-12 shrink-0">
                                                                        <img src={item.image} alt={item.name} className="w-full h-full rounded-xl object-cover border border-gray-200 shadow-sm" />
                                                                        <div className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                            1x
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Add-ons */}
                                                {order.addOnItems?.length > 0 && (
                                                    <div className="pt-2">
                                                        <p className="text-sm font-bold text-gray-900 mb-3">Add-ons</p>
                                                        <div className="space-y-3">
                                                            {order.addOnItems.map((addon, i) => {
                                                                const addonImage = menuMap[addon.id]?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80';
                                                                return (
                                                                    <div key={i} className="flex justify-between items-center">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className="relative w-12 h-12 shrink-0">
                                                                                <img src={addonImage} alt={addon.name} className="w-full h-full rounded-xl object-cover border border-gray-200 shadow-sm" />
                                                                                <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                                    {addon.quantity}x
                                                                                </div>
                                                                            </div>
                                                                            <span className="font-medium text-gray-800 text-sm">{addon.name}</span>
                                                                        </div>
                                                                        <span className="font-bold text-gray-900">₹{(addon.price * addon.quantity).toFixed(2)}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {order.items?.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="relative w-12 h-12 shrink-0">
                                                                {item.image ? (
                                                                    <img src={item.image} alt={item.name} className="w-full h-full rounded-xl object-cover border border-gray-200 shadow-sm" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                                                                        <span className="text-gray-400 font-bold text-[10px]">Img</span>
                                                                    </div>
                                                                )}
                                                                <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                    {item.quantity}x
                                                                </div>
                                                            </div>
                                                            <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                                        </div>
                                                        {item.price && <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>}
                                                    </div>
                                                ))}
                                                {order.freeFood && (
                                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-gray-200">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="relative w-12 h-12 shrink-0">
                                                                {order.freeFood.imageUrl ? (
                                                                    <img src={order.freeFood.imageUrl} alt={order.freeFood.name} className="w-full h-full rounded-xl object-cover border border-orange-200 shadow-sm" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-orange-50 rounded-xl flex items-center justify-center border border-orange-200">
                                                                        <Gift className="w-5 h-5 text-orange-400" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                    1x
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-orange-700 text-sm flex items-center">
                                                                {order.freeFood.name}
                                                                <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black">Free</span>
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-gray-400 line-through text-sm">₹{order.freeFood.price || 0}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {displayTotal > 0 && (
                                            <div className="pt-4 border-t border-dashed border-gray-200 flex justify-between items-center">
                                                <span className="font-bold text-gray-900 text-sm">Total Paid</span>
                                                <span className="font-black text-gray-900 text-lg">₹{Number(displayTotal).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delivery Info */}
                                    <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Delivery Information</h4>
                                        
                                        {order.type !== 'Instant' && (
                                            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    <span>Selected Slot</span>
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">{order.deliverySlot || 'Standard'}</span>
                                            </div>
                                        )}
                                        {order.status === 'pending' && (
                                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start space-x-3">
                                                <div className="bg-orange-100 p-2 rounded-full shrink-0">
                                                    <Clock className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-orange-900 text-sm">Your order is preparing!</h4>
                                                    <p className="text-orange-700 text-xs mt-1 leading-relaxed">
                                                        We will assign a delivery partner shortly. You'll get their details here once assigned.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {order.status === 'assigned' && (
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                                                        <User className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{order.deliveryBoyData?.name || 'Delivery Partner'}</p>
                                                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
                                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                            <span>4.8</span>
                                                            <span className="px-1">•</span>
                                                            <span>Partner</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {order.deliveryBoyData?.phone && (
                                                    <a href={`tel:${order.deliveryBoyData.phone}`} className="bg-green-50 p-2.5 rounded-full text-green-600 hover:bg-green-100 transition-colors">
                                                        <Phone className="w-5 h-5" />
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {order.status === 'delivered' && (
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start space-x-3">
                                                <div className="bg-green-100 p-2 rounded-full shrink-0">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-green-900 text-sm">Successfully Delivered!</h4>
                                                    <p className="text-green-700 text-xs mt-1 leading-relaxed">
                                                        This order has been safely delivered to your address. Enjoy your meal!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {order.status === 'delivered' && (() => {
                                            const itemsList = order.type === 'Subscription' ? order.menuItems : order.items;
                                            const unratedItems = itemsList?.filter(i => !(order.reviewedItems || []).includes(i.id));
                                            return unratedItems?.length > 0;
                                        })() && (
                                            <div className="mt-4 text-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenReview(order);
                                                    }}
                                                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-2.5 px-6 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm uppercase tracking-widest active:scale-95"
                                                >
                                                    <Star className="w-4 h-4 fill-white" />
                                                    <span>Rate Items</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {orders.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-5" />
                        <h3 className="text-xl font-bold text-gray-900">No Orders Yet</h3>
                        <p className="text-gray-500 mt-2">Looks like you haven't placed any delicious orders.</p>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Rate your food!</h2>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Order #{generateNumericId(reviewOrder?.id)}</p>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Select Item */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Item to Rate</label>
                                <select 
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-semibold text-gray-900 outline-none focus:border-amber-500 transition-colors"
                                    value={reviewItem?.id || ''}
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        let item = null;
                                        if (reviewOrder?.type === 'Subscription') {
                                            item = reviewOrder.menuItems?.find(i => i.id === selectedId);
                                        } else {
                                            item = reviewOrder?.items?.find(i => i.id === selectedId);
                                        }
                                        setReviewItem(item);
                                    }}
                                >
                                    {reviewOrder?.type === 'Subscription' 
                                        ? reviewOrder.menuItems?.filter(i => !(reviewOrder.reviewedItems || []).includes(i.id)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                                        : reviewOrder?.items?.filter(i => !(reviewOrder.reviewedItems || []).includes(i.id)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                                    }
                                </select>
                            </div>

                            {/* Stars */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Rating</label>
                                <div className="flex space-x-2">
                                    {[1,2,3,4,5].map(star => (
                                        <button 
                                            key={star} 
                                            onClick={() => setRating(star)}
                                            className={`p-2 rounded-full transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                                        >
                                            <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400' : ''}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Review Text */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Review (Optional)</label>
                                <textarea 
                                    rows="3"
                                    placeholder="How was the taste, packaging, and freshness?"
                                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-900 outline-none focus:border-amber-500 transition-colors resize-none"
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Photos */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Photos (Up to 3)</label>
                                <div className="flex items-center space-x-4">
                                    <label className="cursor-pointer bg-orange-50 text-orange-600 border border-orange-200 border-dashed rounded-xl p-4 flex flex-col items-center justify-center w-24 h-24 hover:bg-orange-100 transition-colors">
                                        <Upload className="w-6 h-6 mb-1" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    </label>
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {reviewPhotos.map((file, i) => (
                                            <div key={i} className="w-24 h-24 shrink-0 relative rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm">
                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                            <button 
                                onClick={submitReview}
                                disabled={isSubmittingReview || !reviewItem}
                                className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isSubmittingReview ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Review"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
