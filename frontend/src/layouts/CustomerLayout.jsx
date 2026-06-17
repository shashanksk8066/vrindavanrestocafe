import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, ShoppingBag, User, Utensils , Search } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import SearchPopup from '../components/SearchPopup';

const CustomerLayout = () => {
    const location = useLocation();
    const { user } = useAuthStore();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Scale down UI for customer panel
    useEffect(() => {
        document.documentElement.style.fontSize = '14px';
        return () => {
            document.documentElement.style.fontSize = ''; // Reset on unmount
        };
    }, []);

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Menu', path: '/menu', icon: Utensils },
        { name: 'Plans', path: '/plans', icon: Calendar },
        ...(user ? [
            { name: 'Orders', path: '/orders', icon: ShoppingBag },
            { name: 'Profile', path: '/profile', icon: User },
        ] : [
            { name: 'Login', path: '/login', icon: User },
        ])
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-20">
            {/* Desktop Top Navbar (Hidden on mobile) */}
            <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 z-50 items-center justify-between px-8 transition-all">
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>

                <Link to="/" className="flex items-center space-x-3 relative group ml-48">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full group-hover:bg-amber-500/30 transition-all duration-300"></div>
                    <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain scale-[2.5] relative z-10 drop-shadow-md" />
                </Link>

                <nav className="flex space-x-2">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link 
                                key={item.name} 
                                to={item.path}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${isActive ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                    
                    {/* Search Button (Desktop) */}
                    <button 
                        onClick={() => setIsSearchOpen(true)} 
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-gray-500 hover:bg-gray-50 hover:text-orange-500 transition-all duration-200 ml-2"
                    >
                        <Search className="w-5 h-5" />
                        <span>Search</span>
                    </button>
                </nav>
            </header>

            {/* Mobile Header (Hidden on Desktop) */}
            <header className="md:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm z-50 px-4 h-16 flex items-center justify-center">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>
                <Link to="/" className="flex items-center space-x-2 relative">
                    <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full"></div>
                    <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain scale-[2.5] relative z-10 drop-shadow-sm" />
                </Link>

                <button onClick={() => setIsSearchOpen(true)} className="absolute right-4 p-2 text-gray-600 hover:text-orange-500 transition-colors">
                    <Search className="w-6 h-6" />
                </button>
            </header>


            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto md:p-8">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Hidden on desktop) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-50 flex justify-around items-center px-2 pb-safe">
                {navItems.map(item => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link 
                            key={item.name} 
                            to={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${isActive ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <div className={`relative p-1 rounded-full ${isActive ? 'bg-amber-50' : ''}`}>
                                <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            </div>
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
            <SearchPopup isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
};

export default CustomerLayout;
