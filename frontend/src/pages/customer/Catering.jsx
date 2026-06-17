import React, { useState } from 'react';
import { ArrowLeft, Phone, Send, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const Catering = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        description: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'cateringInquiries'), {
                ...formData,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSuccess(true);
            setFormData({ name: '', phone: '', description: '' });
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            alert('Failed to submit your inquiry. Please try again or call us directly.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
                <h2 className="text-3xl font-black text-gray-900 mb-2">Request Received!</h2>
                <p className="text-gray-600 text-center max-w-md mb-8">
                    Thank you for reaching out. Our team will contact you shortly to discuss your catering requirements in detail.
                </p>
                <button 
                    onClick={() => navigate('/')}
                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-all"
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
                <h1 className="text-xl font-black text-gray-900">Catering Services</h1>
            </div>

            <div className="p-4 md:p-6 max-w-lg mx-auto mt-4">
                {/* Intro Section */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 text-white mb-6 shadow-md">
                    <h2 className="text-2xl font-black mb-2">Make Your Event Special</h2>
                    <p className="text-orange-50 text-sm mb-6">
                        From intimate gatherings to grand celebrations, we provide premium catering tailored to your taste. Let us take care of the food while you enjoy the moment.
                    </p>
                    <a 
                        href="tel:8618783795"
                        className="flex items-center justify-center w-full bg-white text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-50 transition-colors shadow-sm"
                    >
                        <Phone className="w-5 h-5 mr-2" />
                        Call Now: 8618783795
                    </a>
                </div>

                <div className="flex items-center justify-center mb-6">
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                    <span className="px-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Or Leave a Message</span>
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
                </div>

                {/* Inquiry Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
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
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Requirements / Details</label>
                        <textarea
                            required
                            rows="4"
                            placeholder="Event date, number of guests, preferred menu, etc."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium resize-none"
                        ></textarea>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !formData.name || !formData.phone || !formData.description}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" /> Submit Inquiry
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Catering;
