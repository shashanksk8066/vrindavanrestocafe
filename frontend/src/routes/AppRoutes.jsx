import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
const Login = React.lazy(() => import('../pages/auth/Login'));
const Signup = React.lazy(() => import('../pages/auth/Signup'));
const AdminLogin = React.lazy(() => import('../pages/admin/AdminLogin'));
const DeliveryLogin = React.lazy(() => import('../pages/delivery/DeliveryLogin'));
import AdminLayout from '../layouts/AdminLayout';
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const AdminPlans = React.lazy(() => import('../pages/admin/Plans'));
const AdminMenus = React.lazy(() => import('../pages/admin/Menus'));
const DailySchedule = React.lazy(() => import('../pages/admin/DailySchedule'));
const AdminCategories = React.lazy(() => import('../pages/admin/Categories'));
const AdminOrders = React.lazy(() => import('../pages/admin/Orders'));
const AdminUsers = React.lazy(() => import('../pages/admin/Users'));
const AdminDeliveries = React.lazy(() => import('../pages/admin/Deliveries'));
const ContactUs = React.lazy(() => import('../pages/legal/ContactUs'));
const TermsAndConditions = React.lazy(() => import('../pages/legal/TermsAndConditions'));
const PrivacyPolicy = React.lazy(() => import('../pages/legal/PrivacyPolicy'));
const RefundPolicy = React.lazy(() => import('../pages/legal/RefundPolicy'));
const AdminCoupons = React.lazy(() => import('../pages/admin/Coupons'));
const AdminRewards = React.lazy(() => import('../pages/admin/AdminRewards'));
const AdminFreeFoods = React.lazy(() => import('../pages/admin/FreeFoods'));
const AdminSettings = React.lazy(() => import('../pages/admin/Settings'));
const AdminReferrals = React.lazy(() => import('../pages/admin/AdminReferrals'));
const AdminSubscriptionBookings = React.lazy(() => import('../pages/admin/SubscriptionBookings'));
const AdminSubscriptionEnrollments = React.lazy(() => import('../pages/admin/AdminSubscriptionEnrollments'));
const AdminInstantOrders = React.lazy(() => import('../pages/admin/InstantOrders'));
const AdminReviews = React.lazy(() => import('../pages/admin/Reviews'));
const AdminLiveOrders = React.lazy(() => import('../pages/admin/AdminLiveOrders'));
const AdminCashiers = React.lazy(() => import('../pages/admin/AdminCashiers'));
const AdminBanners = React.lazy(() => import('../pages/admin/AdminBanners'));
const AdminGallery = React.lazy(() => import('../pages/admin/AdminGallery'));
const AdminCatering = React.lazy(() => import('../pages/admin/AdminCatering'));
const AdminEvents = React.lazy(() => import('../pages/admin/AdminEvents'));

const CashierLogin = React.lazy(() => import('../pages/cashier/CashierLogin'));
import CashierLayout from '../layouts/CashierLayout';

import CustomerLayout from '../layouts/CustomerLayout';
const CustomerHome = React.lazy(() => import('../pages/customer/Home'));
const CustomerMenu = React.lazy(() => import('../pages/customer/Menu'));
const CustomerPlans = React.lazy(() => import('../pages/customer/Plans'));
const CustomerOrders = React.lazy(() => import('../pages/customer/Orders'));
const CustomerProfile = React.lazy(() => import('../pages/customer/Profile'));
const CustomerRewards = React.lazy(() => import('../pages/customer/CustomerRewards'));
const CustomerReferrals = React.lazy(() => import('../pages/customer/CustomerReferrals'));
const CustomerCheckout = React.lazy(() => import('../pages/customer/Checkout'));
const PlanCheckout = React.lazy(() => import('../pages/customer/PlanCheckout'));
const BookMeal = React.lazy(() => import('../pages/customer/BookMeal'));
const PaymentCallback = React.lazy(() => import('../pages/customer/PaymentCallback'));
const LandingPage = React.lazy(() => import('../pages/public/LandingPage'));
const GalleryPage = React.lazy(() => import('../pages/public/GalleryPage'));
const Catering = React.lazy(() => import('../pages/customer/Catering'));
const Events = React.lazy(() => import('../pages/customer/Events'));
const AboutUs = React.lazy(() => import('../pages/customer/AboutUs'));

const DeliveryDashboard = React.lazy(() => import('../pages/delivery/Dashboard'));

// Dine-In
const DineInMenu = React.lazy(() => import('../pages/customer/DineInMenu'));
const DineInCheckout = React.lazy(() => import('../pages/customer/DineInCheckout'));
const DineInTrack = React.lazy(() => import('../pages/customer/DineInTrack'));

import useAuthStore from '../store/useAuthStore';

// No more dummy placeholders needed

const AppRoutes = () => {
    const { user, role, isAuthReady } = useAuthStore();

    // Basic loading state for the initial auth check
    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
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
                {/* Legal Pages */}
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/refund" element={<RefundPolicy />} />


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
                    <Route path="subscription-enrollments" element={<AdminSubscriptionEnrollments />} />
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
        </Suspense>
    );
};

export default AppRoutes;
