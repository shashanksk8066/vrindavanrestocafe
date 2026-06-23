import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, getDocs, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { Search, FileText, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

const AdminSubscriptionEnrollments = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, expired
    const [usersMap, setUsersMap] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Users to map User ID to Name/Phone
                const usersSnap = await getDocs(collection(db, 'users'));
                const uMap = {};
                usersSnap.forEach(d => {
                    uMap[d.id] = d.data();
                });
                setUsersMap(uMap);

                // Fetch Subscriptions
                const subQ = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
                const subSnap = await getDocs(subQ);
                const subList = [];
                subSnap.forEach(d => {
                    subList.push({ id: d.id, ...d.data() });
                });
                setSubscriptions(subList);
            } catch (error) {
                console.error("Error fetching subscriptions", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleDelete = async (subId) => {
        if (window.confirm('Are you sure you want to permanently delete this subscription enrollment? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'subscriptions', subId));
                setSubscriptions(prev => prev.filter(sub => sub.id !== subId));
                alert('Subscription deleted successfully.');
            } catch (error) {
                console.error("Error deleting subscription:", error);
                alert('Failed to delete subscription.');
            }
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        const user = usersMap[sub.userId];
        const userName = user?.name || '';
        const userPhone = user?.phone || '';
        const searchLower = searchQuery.toLowerCase();

        const matchesSearch = userName.toLowerCase().includes(searchLower) ||
                              userPhone.toLowerCase().includes(searchLower) ||
                              (sub.planName && sub.planName.toLowerCase().includes(searchLower)) ||
                              sub.id.toLowerCase().includes(searchLower);

        const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Active</span>;
            case 'expired':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Expired</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1"/> {status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meal Plan Enrollments</h1>
                    <p className="text-gray-500">Manage all user subscription plans and enrollments</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by user name, phone, plan name or ID..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Size</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSubscriptions.map((sub) => {
                                const user = usersMap[sub.userId];
                                return (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user?.name || 'Unknown User'}</div>
                                            <div className="text-sm text-gray-500">{user?.phone || 'No Phone'}</div>
                                            <div className="text-xs text-gray-400 mt-1">ID: {sub.id.substring(0,8)}...</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">{sub.planName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 capitalize">{sub.mealType}</div>
                                            <div className="text-xs text-gray-500">For {sub.groupSize} People</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {sub.remainingMeals} / {sub.totalMeals} left
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div 
                                                    className="bg-amber-500 h-1.5 rounded-full" 
                                                    style={{ width: `${(sub.remainingMeals / sub.totalMeals) * 100}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{new Date(sub.startDate).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">to {new Date(sub.endDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(sub.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleDelete(sub.id)} 
                                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-flex items-center"
                                                title="Delete Enrollment"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSubscriptions.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                        No enrollments found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSubscriptionEnrollments;
