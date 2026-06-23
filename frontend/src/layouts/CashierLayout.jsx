import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Radio, LogOut, Wallet, Zap } from 'lucide-react';

const CashierLayout = () => {
    const { logout, user } = useAuthStore();
    const location = useLocation();

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
                        <Link
                            to="/cashier"
                            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                                location.pathname === '/cashier' 
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' 
                                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                        >
                            <Radio className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform ${location.pathname === '/cashier' ? 'text-white scale-110' : 'text-gray-400 group-hover:text-amber-500'}`} />
                            Live Orders
                        </Link>

                        <Link
                            to="/cashier/instant-orders"
                            className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                                location.pathname === '/cashier/instant-orders' 
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' 
                                    : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                        >
                            <Zap className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform ${location.pathname === '/cashier/instant-orders' ? 'text-white scale-110' : 'text-gray-400 group-hover:text-amber-500'}`} />
                            Instant Orders
                        </Link>
                    </nav>
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="mb-4 px-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Logged in as</div>
                        <div className="text-sm font-black text-gray-900 truncate">{user?.email}</div>
                    </div>
                    <button
                        onClick={() => logout()}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden mt-1">
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default CashierLayout;
