import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Phone, Trash2, Clock, CheckCircle, PhoneCall, Filter, Search } from 'lucide-react';

const AdminCatering = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const q = query(
            collection(db, 'cateringInquiries'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInquiries(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inquiries:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateStatus = async (id, newStatus) => {
        try {
            const inquiryRef = doc(db, 'cateringInquiries', id);
            await updateDoc(inquiryRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this inquiry?")) return;
        try {
            await deleteDoc(doc(db, 'cateringInquiries', id));
        } catch (error) {
            console.error("Error deleting inquiry:", error);
            alert("Failed to delete inquiry.");
        }
    };

    const filteredInquiries = statusFilter === 'all' 
        ? inquiries 
        : inquiries.filter(inquiry => inquiry.status === statusFilter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'contacted': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Catering Inquiries</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage all incoming catering requests from customers.</p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Inquiries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInquiries.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 py-16">
                        <CheckCircle className="w-16 h-16 text-gray-200 mb-4" />
                        <p className="text-gray-500 font-medium text-lg">No catering inquiries found.</p>
                    </div>
                ) : (
                    filteredInquiries.map(inquiry => (
                        <div key={inquiry.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-bold text-gray-900 text-lg truncate">{inquiry.name}</h3>
                                        <div className="flex items-center text-gray-500 text-sm mt-1">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            {inquiry.createdAt ? new Date(inquiry.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusColor(inquiry.status)}`}>
                                        {inquiry.status || 'pending'}
                                    </span>
                                </div>
                                
                                <a href={`tel:${inquiry.phone}`} className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 hover:underline mb-4 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {inquiry.phone}
                                </a>
                                
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirements</h4>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{inquiry.description}</p>
                                </div>
                            </div>
                            
                            {/* Actions Footer */}
                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
                                <select 
                                    value={inquiry.status || 'pending'}
                                    onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                                    className="bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                                
                                <button 
                                    onClick={() => handleDelete(inquiry.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Inquiry"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminCatering;
