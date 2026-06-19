import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { 
    LayoutDashboard, 
    CalendarDays, 
    UtensilsCrossed, 
    Menu as MenuIcon,
    ShoppingCart,
    Truck,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    CalendarClock,
    Ticket,
    CalendarCheck2,
    Zap,
    Star,
    Radio,
    Wallet,
    Presentation,
    Image as ImageIcon,
    Gift
, ClipboardList } from 'lucide-react';

const AdminLayout = () => {
    const { logout } = useAuthStore();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Scale down UI for admin dashboard
    useEffect(() => {
        document.documentElement.style.fontSize = '14px';
        return () => {
            document.documentElement.style.fontSize = ''; // Reset on unmount
        };
    }, []);

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Referrals', href: '/admin/referrals', icon: Gift },
        { name: 'Plans', href: '/admin/plans', icon: CalendarDays },
        { name: 'Menu Items', href: '/admin/subscription-menu', icon: UtensilsCrossed },
        { name: 'Daily Schedule', href: '/admin/daily-schedule', icon: CalendarClock },
        { name: 'Sub Bookings', href: '/admin/subscription-bookings', icon: CalendarCheck2 },
        { name: 'Enrollments', href: '/admin/subscription-enrollments', icon: ClipboardList },
        { name: 'Instant Orders', href: '/admin/instant-orders', icon: Zap },
        { name: 'Live Orders', href: '/admin/live-orders', icon: Radio },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Deliveries', href: '/admin/deliveries', icon: Truck },
        { name: 'Cashiers', href: '/admin/cashiers', icon: Wallet },
        { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
        { name: 'Rewards', href: '/admin/rewards', icon: Gift },
        { name: 'Free Foods', href: '/admin/free-foods', icon: Gift },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Reviews', href: '/admin/reviews', icon: Star },
        { name: 'Catering', href: '/admin/catering', icon: UtensilsCrossed },
        { name: 'Events', href: '/admin/events', icon: CalendarCheck2 },
        { name: 'Landing Banners', href: '/admin/landing-banners', icon: Presentation },
        { name: 'Landing Gallery', href: '/admin/landing-gallery', icon: ImageIcon },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex relative">
            {/* Top decorative gradient for the entire page */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 z-50"></div>

            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-72 bg-white/95 backdrop-blur-xl border-r border-gray-100 shadow-sm z-40 mt-1">
                <div className="h-28 flex items-center px-6 border-b border-gray-100 space-x-2 relative group justify-center">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full group-hover:bg-amber-500/30 transition-all duration-300 m-4"></div>
                    <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain scale-[1.5] relative z-10 drop-shadow-md" />
                </div>
                <div className="flex-1 overflow-y-auto py-6">
                    <nav className="space-y-1.5 px-4">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' 
                                            : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                                    }`}
                                >
                                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform ${isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-amber-500'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-1 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm z-40 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2 relative">
                    <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full"></div>
                    <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain scale-[1.5] relative z-10 drop-shadow-sm ml-2" />
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-700 hover:bg-amber-50 rounded-lg transition-colors">
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
                    <div 
                        className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl flex flex-col transform transition-transform"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>
                        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 mt-1">
                            <span className="text-xl font-bold text-gray-900">Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-6">
                            <nav className="space-y-1.5 px-4">
                                {navigation.map((item) => {
                                    const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center px-4 py-3.5 text-base font-semibold rounded-xl transition-all ${
                                                isActive 
                                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' 
                                                    : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                                            }`}
                                        >
                                            <Icon className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center w-full px-4 py-3.5 text-base font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                            >
                                <LogOut className="mr-3 h-6 w-6" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-20 md:pt-1 bg-gray-50/50">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
