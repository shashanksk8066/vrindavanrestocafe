import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { Mail, Lock, LogIn, Loader2, Truck } from 'lucide-react';

const DeliveryLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, resetPassword, error, loading } = useAuthStore();
    const [resetMsg, setResetMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password, 'delivery');
            navigate('/delivery');
        } catch (err) {
            console.error('Delivery login failed', err);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setResetMsg('');
        if (!email) {
            alert('Please enter your delivery email address first.');
            return;
        }
        try {
            await resetPassword(email);
            setResetMsg('Password reset link sent! Check your email.');
        } catch (err) {
            console.error('Password reset failed', err);
        }
    };

    return (
        <div 
            className="flex items-center justify-center min-h-screen bg-gray-900 bg-cover bg-center relative px-4 py-12"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')" }}
        >
            {/* Dark overlay for better readability */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 overflow-hidden">
                    {/* Decorative Top Accent */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>

                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                            <img src="/logo.png" alt="Driver Portal" className="relative w-32 h-32 object-contain drop-shadow-xl mb-4" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Driver Portal</h1>
                        <p className="text-gray-500 mt-2 text-center text-sm font-medium">Login to access your delivery dashboard</p>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start shadow-sm">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Driver Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="driver@vrindavan.com"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-semibold text-gray-700">Password</label>
                                <button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-amber-600 hover:text-amber-500 transition-colors">Forgot password?</button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-gray-900 to-black text-white font-bold py-4 px-4 rounded-xl hover:from-black hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 shadow-lg shadow-black/20 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Log In <LogIn className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            Not a driver?{' '}
                            <Link to="/login" className="font-bold text-amber-600 hover:text-amber-500 transition-colors">Go to Customer Login</Link>
                        </p>
                    </div>
                </div>
                
                {/* Footer text below the card */}
                <div className="mt-8 text-center text-white/60 text-sm">
                    &copy; {new Date().getFullYear()} Vrindavan Resto Cafe. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default DeliveryLogin;
