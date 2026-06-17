import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Star, MessageSquare, Image as ImageIcon, Calendar, Trash2 } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItemFilter, setSelectedItemFilter] = useState('All');

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Fetch reviews ordered by newest first
                const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const data = [];
                snap.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setReviews(data);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    const handleDeleteReview = async (review) => {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        
        try {
            // Delete the review document
            await deleteDoc(doc(db, 'reviews', review.id));
            
            // Recalculate average rating in mainMenu
            const menuRef = doc(db, 'mainMenu', review.itemId);
            const menuSnap = await getDoc(menuRef);
            if (menuSnap.exists()) {
                const data = menuSnap.data();
                const currentTotal = data.totalRatings || 1; // Prevent division by zero if somehow missing
                const currentAvg = data.averageRating || 0;
                
                const newTotal = Math.max(0, currentTotal - 1);
                
                let newAvg = 0;
                if (newTotal > 0) {
                    // Reverse the average calculation formula
                    newAvg = ((currentAvg * currentTotal) - review.rating) / newTotal;
                    // Ensure it doesn't go below 0 or above 5 due to floating point inaccuracies
                    newAvg = Math.min(5, Math.max(0, newAvg));
                }
                
                await updateDoc(menuRef, {
                    averageRating: newAvg,
                    totalRatings: newTotal
                });
            }

            // Remove from UI state
            setReviews(prev => prev.filter(r => r.id !== review.id));
        } catch (error) {
            console.error("Error deleting review:", error);
            alert("Failed to delete review.");
        }
    };

    const handleToggleLanding = async (review) => {
        try {
            const newStatus = !review.showOnLanding;
            await updateDoc(doc(db, 'reviews', review.id), { showOnLanding: newStatus });
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, showOnLanding: newStatus } : r));
        } catch (error) {
            console.error("Error updating review landing status:", error);
            alert("Failed to update status");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    // Derive unique item names for the filter dropdown
    const uniqueItems = ['All', ...new Set(reviews.map(r => r.itemName))];
    const filteredReviews = selectedItemFilter === 'All' 
        ? reviews 
        : reviews.filter(r => r.itemName === selectedItemFilter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Customer Reviews</h1>
                    <p className="text-gray-500 font-medium">See what your customers are saying about your food.</p>
                </div>
                
                {reviews.length > 0 && (
                    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                        <span className="text-sm font-bold text-gray-500">Filter by Item:</span>
                        <select 
                            value={selectedItemFilter}
                            onChange={(e) => setSelectedItemFilter(e.target.value)}
                            className="text-sm font-bold text-gray-900 bg-transparent border-none focus:ring-0 cursor-pointer"
                        >
                            {uniqueItems.map(item => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {filteredReviews.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-5" />
                    <h3 className="text-xl font-bold text-gray-900">No Reviews Found</h3>
                    <p className="text-gray-500 mt-2">No reviews match your current filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredReviews.map(review => (
                        <div key={review.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{review.itemName}</h3>
                                        <p className="text-sm font-medium text-gray-500">By {review.userName} • Order #{generateNumericId(review.orderId)}</p>
                                    </div>
                                    <div className="flex space-x-1">
                                        {[1,2,3,4,5].map(star => (
                                            <Star 
                                                key={star} 
                                                className={`w-5 h-5 ${review.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                                            />
                                        ))}
                                    </div>
                                </div>

                                {review.reviewText && (
                                    <div className="bg-gray-50/50 rounded-2xl p-4 mb-4 border border-gray-100">
                                        <p className="text-gray-700 italic">"{review.reviewText}"</p>
                                    </div>
                                )}

                                {review.photos && review.photos.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                            <ImageIcon className="w-4 h-4" />
                                            <span>Photos</span>
                                        </div>
                                        <div className="flex space-x-3 overflow-x-auto pb-2">
                                            {review.photos.map((photo, i) => (
                                                <div key={i} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                                    <a href={photo} target="_blank" rel="noreferrer">
                                                        <img src={photo} alt="Review attachment" className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(review.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!!review.showOnLanding}
                                            onChange={() => handleToggleLanding(review)}
                                            className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold text-gray-500">Show on Landing</span>
                                    </label>
                                    <button 
                                        onClick={() => handleDeleteReview(review)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Review"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reviews;
