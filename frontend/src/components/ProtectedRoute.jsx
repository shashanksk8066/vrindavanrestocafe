import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, role, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Redirect to their respective dashboards if they hit a forbidden route
        if (role === 'admin') return <Navigate to="/admin" replace />;
        if (role === 'delivery') return <Navigate to="/delivery" replace />;
        return <Navigate to="/dashboard" replace />; // customer default
    }

    return <Outlet />;
};

export default ProtectedRoute;
