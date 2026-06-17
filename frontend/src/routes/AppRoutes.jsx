import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import AdminLogin from '../pages/admin/AdminLogin';
import DeliveryLogin from '../pages/delivery/DeliveryLogin';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminPlans from '../pages/admin/Plans';
import AdminMenus from '../pages/admin/Menus';
import DailySchedule from '../pages/admin/DailySchedule';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';
import AdminUsers from '../pages/admin/Users';
import AdminDeliveries from '../pages/admin/Deliveries';
import AdminCoupons from '../pages/admin/Coupons';
import AdminRewards from '../pages/admin/AdminRewards';
import AdminFreeFoods from '../pages/admin/FreeFoods';
import AdminSettings from '../pages/admin/Settings';
import AdminReferrals from '../pages/admin/AdminReferrals';
import AdminSubscriptionBookings from '../pages/admin/SubscriptionBookings';
import AdminInstantOrders from '../pages/admin/InstantOrders';
import AdminReviews from '../pages/admin/Reviews';
import AdminLiveOrders from '../pages/admin/AdminLiveOrders';
import AdminCashiers from '../pages/admin/AdminCashiers';
import AdminBanners from '../pages/admin/AdminBanners';
import AdminGallery from '../pages/admin/AdminGallery';
import AdminCatering from '../pages/admin/AdminCatering';
import AdminEvents from '../pages/admin/AdminEvents';

import CashierLogin from '../pages/cashier/CashierLogin';
import CashierLayout from '../layouts/CashierLayout';

import CustomerLayout from '../layouts/CustomerLayout';
import CustomerHome from '../pages/customer/Home';
import CustomerMenu from '../pages/customer/Menu';
import CustomerPlans from '../pages/customer/Plans';
import CustomerOrders from '../pages/customer/Orders';
import CustomerProfile from '../pages/customer/Profile';
import CustomerRewards from '../pages/customer/CustomerRewards';
import CustomerReferrals from '../pages/customer/CustomerReferrals';
import CustomerCheckout from '../pages/customer/Checkout';
import PlanCheckout from '../pages/customer/PlanCheckout';
import BookMeal from '../pages/customer/BookMeal';
import PaymentCallback from '../pages/customer/PaymentCallback';
import LandingPage from '../pages/public/LandingPage';
import GalleryPage from '../pages/public/GalleryPage';
import Catering from '../pages/customer/Catering';
import Events from '../pages/customer/Events';
import AboutUs from '../pages/customer/AboutUs';

import DeliveryDashboard from '../pages/delivery/Dashboard';

// Dine-In
import DineInMenu from '../pages/customer/DineInMenu';
import DineInCheckout from '../pages/customer/DineInCheckout';
import DineInTrack from '../pages/customer/DineInTrack';

import useAuthStore from '../store/useAuthStore';

// No more dummy placeholders needed

const AppRoutes = () => {
    const { user, role, loading } = useAuthStore();

    // Basic loading state for the initial auth check
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/welcome" element={<LandingPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
            <Route path="/admin/login" element={user && role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLogin />} />
            <Route path="/delivery/login" element={user && role === 'delivery' ? <Navigate to="/delivery" replace /> : <DeliveryLogin />} />
            <Route path="/cashier/login" element={user && role === 'cashier' ? <Navigate to="/cashier" replace /> : <CashierLogin />} />

            {/* Dine-In Public Routes */}
            <Route path="/dine-in/track" element={<DineInTrack />} />
            <Route path="/dine-in/:tableNumber" element={<DineInMenu />} />
            <Route path="/dine-in/:tableNumber/checkout" element={<DineInCheckout />} />
            
            {/* Public Payment Callback (Handles unauthenticated Dine-In as well as authenticated) */}
            <Route path="/payment-callback" element={<PaymentCallback />} />

            {/* Customer Routes */}
            <Route element={<CustomerLayout />}>
                <Route path="/" element={<CustomerHome />} />
                <Route path="plans" element={<CustomerPlans />} />
                <Route path="menu" element={<CustomerMenu />} />
                <Route path="catering" element={<Catering />} />
                <Route path="events" element={<Events />} />
                <Route path="about" element={<AboutUs />} />
                <Route element={<ProtectedRoute allowedRoles={['customer', 'user']} />}>
                    <Route path="checkout" element={<CustomerCheckout />} />
                    <Route path="plan-checkout" element={<PlanCheckout />} />
                    <Route path="book-meal" element={<BookMeal />} />
                    <Route path="orders" element={<CustomerOrders />} />
                    <Route path="profile" element={<CustomerProfile />} />
                    <Route path="rewards" element={<CustomerRewards />} />
                    <Route path="referrals" element={<CustomerReferrals />} />
                </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="plans" element={<AdminPlans />} />
                    <Route path="subscription-menu" element={<AdminMenus />} />
                    <Route path="daily-schedule" element={<DailySchedule />} />
                    <Route path="main-menu" element={<AdminMenus />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="deliveries" element={<AdminDeliveries />} />
                    <Route path="cashiers" element={<AdminCashiers />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="rewards" element={<AdminRewards />} />
                    <Route path="free-foods" element={<AdminFreeFoods />} />
                    <Route path="subscription-bookings" element={<AdminSubscriptionBookings />} />
                    <Route path="instant-orders" element={<AdminInstantOrders />} />
                    <Route path="live-orders" element={<AdminLiveOrders />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="referrals" element={<AdminReferrals />} />
                    <Route path="landing-banners" element={<AdminBanners />} />
                    <Route path="landing-gallery" element={<AdminGallery />} />
                    <Route path="catering" element={<AdminCatering />} />
                    <Route path="events" element={<AdminEvents />} />
                    {/* Additional admin routes will be added here */}
                </Route>
            </Route>

            {/* Delivery Routes */}
            <Route path="/delivery" element={<ProtectedRoute allowedRoles={['delivery']} />}>
                <Route index element={<DeliveryDashboard />} />
            </Route>

            {/* Cashier Routes */}
            <Route element={<ProtectedRoute allowedRoles={['cashier']} />}>
                <Route path="cashier" element={<CashierLayout />}>
                    {/* Reusing AdminLiveOrders because it works perfectly for the cashier use case */}
                    <Route index element={<AdminLiveOrders />} />
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
