import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { UserCheck, UserX } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const data = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleBlockStatus = async (user) => {
        const isBlocked = user.isBlocked || false;
        try {
            await updateDoc(doc(db, 'users', user.id), { isBlocked: !isBlocked });
            fetchUsers();
        } catch (error) {
            console.error("Error updating user status", error);
        }
    };

    if (loading) return <div className="p-4">Loading users...</div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-500 mt-1">Manage customers and access levels</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="py-4 px-6">User</th>
                                <th className="py-4 px-6">Role</th>
                                <th className="py-4 px-6">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-50 hover:bg-orange-50/50 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-sm mr-4 flex-shrink-0 group-hover:shadow-md transition-shadow">
                                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{user.name || 'Unknown User'}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm ${
                                            user.role === 'admin' ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                            : user.role === 'delivery' ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm font-medium text-gray-600">
                                        {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="py-24 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <UserX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">No Users Found</h3>
                                        <p className="text-gray-500 mt-2">There are no users registered in the system yet.</p>
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

export default Users;
