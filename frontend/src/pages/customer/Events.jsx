import SEO from '../../components/SEO';
import React, { useState } from 'react';
import { ArrowLeft, Phone, Send, CheckCircle, CalendarDays, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Events = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        date: '',
        time: '',
        members: '',
        requests: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'eventInquiries'), {
                ...formData,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSuccess(true);
            setFormData({ name: '', phone: '', date: '', time: '', members: '', requests: '' });
        } catch (error) {
            console.error('Error submitting event inquiry:', error);
            alert('Failed to submit your event inquiry. Please try again or call us directly.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            <SEO 
                title="Book Event Space - Vrindavan Resto Cafe" 
                description="Book our beautiful cafe for your private events, parties, and corporate gatherings near Acharya College."
                canonical="/events"
                keywords="Event Space Near Me, Party Hall Solladevanahalli, Birthday Party Venue"
            />
                <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
                <h2 className="text-3xl font-black text-gray-900 mb-2">Booking Requested!</h2>
                <p className="text-gray-600 text-center max-w-md mb-8">
                    Thank you for choosing us for your event. Our team will contact you shortly to confirm the details and availability.
                </p>
                <button 
                    onClick={() => navigate('/')}
                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-95"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="px-4 py-4 md:py-6 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2 text-gray-900 hover:bg-gray-200 bg-white shadow-sm rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-gray-900">Event Booking</h1>
            </div>

            <div className="p-4 md:p-6 max-w-lg mx-auto mt-2">
                {/* Intro Section */}
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white mb-6 shadow-md">
                    <h2 className="text-2xl font-black mb-2">Host Your Event</h2>
                    <p className="text-yellow-50 text-sm mb-6">
                        Birthdays, anniversaries, corporate meetings, or casual get-togethers—we provide the perfect ambiance and food for your memorable occasions.
                    </p>
                    <a 
                        href="tel:8618783795"
                        className="flex items-center justify-center w-full bg-white text-orange-600 font-bold py-3 rounded-xl hover:bg-yellow-50 transition-colors shadow-sm active:scale-95"
                    >
                        <Phone className="w-5 h-5 mr-2" />
                        Call Now: 8618783795
                    </a>
                </div>

                <div className="flex items-center justify-center mb-6">
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                    <span className="px-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Book Online</span>
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                </div>

                {/* Booking Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                required
                                placeholder="e.g. 9876543210"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                                <CalendarDays className="w-4 h-4 mr-1 text-gray-400" /> Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" /> Time
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={(e) => setFormData({...formData, time: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Members */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                            <Users className="w-4 h-4 mr-1 text-gray-400" /> Number of Guests
                        </label>
                        <input
                            type="number"
                            min="1"
                            required
                            placeholder="e.g. 10"
                            value={formData.members}
                            onChange={(e) => setFormData({...formData, members: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                        />
                    </div>

                    {/* Additional Requests */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Additional Requests</label>
                        <textarea
                            rows="3"
                            placeholder="Any special arrangements, decorations, preferred menu items, allergies, etc."
                            value={formData.requests}
                            onChange={(e) => setFormData({...formData, requests: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium resize-none"
                        ></textarea>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !formData.name || !formData.phone || !formData.date || !formData.time || !formData.members}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center mt-2"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" /> Request Booking
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Events;
