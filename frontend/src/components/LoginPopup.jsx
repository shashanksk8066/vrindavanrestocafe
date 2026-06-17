import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, X, Lock } from 'lucide-react';

const LoginPopup = ({ isOpen, onClose, message = "Please login to continue" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="relative p-6 pt-8 text-center">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
                    <p className="text-sm text-gray-500 mb-6 px-4">{message}</p>
                    
                    <div className="space-y-3">
                        <Link 
                            to="/login"
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-black/20"
                        >
                            <LogIn className="w-5 h-5 mr-2" /> Login to Continue
                        </Link>
                        
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-100"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase">Or</span>
                            <div className="flex-grow border-t border-gray-100"></div>
                        </div>

                        <Link 
                            to="/signup"
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-white border-2 border-gray-200 text-gray-900 font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            <UserPlus className="w-5 h-5 mr-2" /> Create an Account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPopup;
