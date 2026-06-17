import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { Mail, Lock, Loader2, Wallet } from 'lucide-react';

const CashierLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password, 'cashier');
            navigate('/cashier');
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all"></div>
                        <img src="/logo.png" alt="Logo" className="h-16 w-16 object-contain scale-[1.5] relative z-10" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cashier Portal</h1>
                    <p className="text-gray-500 font-medium text-sm mt-2">Manage live table orders</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 text-center">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                placeholder="cashier@vrindavan.com"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-orange-500/20 hover:shadow-lg disabled:opacity-50 flex items-center justify-center mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CashierLogin;
