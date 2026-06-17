import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { User, Phone, Mail, Lock, UserPlus, Loader2 } from 'lucide-react';

const Signup = () => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [searchParams] = useSearchParams();
    const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
    const { signup, error, loading } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(email, password, name, phone, referralCode.trim());
            navigate('/'); // Default role is customer
        } catch (err) {
            console.error('Signup failed', err);
        }
    };

    return (
        <div 
            className="flex items-center justify-center min-h-screen bg-gray-900 bg-cover bg-center relative px-4 py-12"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')" }}
        >
            {/* Dark overlay for better readability */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 overflow-hidden">
                    {/* Decorative Top Accent */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500"></div>

                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                            <img src="/logo.png" alt="Vrindavan Resto Cafe" className="relative w-32 h-32 object-contain drop-shadow-xl mb-4" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
                        <p className="text-gray-500 mt-2 text-center text-sm font-medium">Join Vrindavan Resto Cafe</p>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start shadow-sm">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="10-digit mobile number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                                                <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Referral Code (Optional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <UserPlus className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 ease-in-out sm:text-sm uppercase placeholder:normal-case"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code (if any)"
                                    readOnly={!!searchParams.get('ref')}
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-gray-900 to-black text-white font-bold py-4 px-4 rounded-xl hover:from-black hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200 shadow-lg shadow-black/20 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Sign Up <UserPlus className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-amber-600 hover:text-amber-500 transition-colors">Log in</Link>
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

export default Signup;
