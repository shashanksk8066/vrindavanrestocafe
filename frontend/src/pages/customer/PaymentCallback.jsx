import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const PaymentCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    const [status, setStatus] = useState('verifying'); // verifying, success, failed
    const [message, setMessage] = useState('Verifying your payment securely with PhonePe...');
    
    const transactionId = searchParams.get('transactionId');
    const planId = searchParams.get('planId');
    const groupSize = searchParams.get('groupSize');
    const type = searchParams.get('type'); // could be 'addonBooking'
    
    const hasVerified = useRef(false);

    useEffect(() => {
        if (!transactionId) return;
        
        // Require user for authenticated flows
        if (type !== 'dineInBooking' && !user) return;
        
        // Normal subscription requires planId
        if (type !== 'addonBooking' && type !== 'instantBooking' && type !== 'dineInBooking' && !planId) return;

        if (hasVerified.current) return;
        hasVerified.current = true;

        const verifyPayment = async () => {
            try {
                let endpoint = `${import.meta.env.VITE_API_URL || ""}/api/orders/verify-payment`;
                let headers = { 'Content-Type': 'application/json' };
                let bodyData = { transactionId };

                if (type === 'addonBooking') {
                    endpoint = `${import.meta.env.VITE_API_URL || ""}/api/orders/verify-addon-payment`;
                } else if (type === 'instantBooking') {
                    endpoint = `${import.meta.env.VITE_API_URL || ""}/api/orders/verify-instant-payment`;
                } else if (type === 'dineInBooking') {
                    endpoint = `${import.meta.env.VITE_API_URL || ""}/api/orders/dine-in/verify`;
                }

                if (type !== 'dineInBooking' && user) {
                    const token = await user.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                    if (type !== 'addonBooking' && type !== 'instantBooking') {
                        bodyData.planId = planId;
                        bodyData.groupSize = groupSize ? parseInt(groupSize) : 1;
                    }
                }
                    
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(bodyData)
                });
                
                const data = await res.json();
                
                if (data.success) {
                    setStatus('success');
                    if (type === 'instantBooking') {
                        setMessage('Payment successful! Your order has been placed.');
                    } else if (type === 'addonBooking') {
                        setMessage('Payment successful! Meal with add-ons has been booked.');
                    } else if (type === 'dineInBooking') {
                        setMessage('Payment successful! Your table order has been placed.');
                    } else {
                        setMessage('Payment verified successfully! Your subscription is now active.');
                    }
                    setTimeout(() => {
                        if (type === 'instantBooking') {
                            navigate('/orders');
                        } else if (type === 'dineInBooking') {
                            navigate(`/dine-in/track?phone=${data.phone}`);
                        } else {
                            navigate('/plans?tab=my-plans');
                        }
                    }, 3000);
                } else {
                    setStatus('failed');
                    setMessage(`Payment failed: ${data.message || 'Transaction was not completed.'}`);
                }
            } catch (error) {
                console.error("Verification Error", error);
                setStatus('failed');
                setMessage('Network error while verifying payment. If amount was deducted, it will be refunded.');
            }
        };

        verifyPayment();
    }, [user, transactionId, planId, navigate, type]);

    if (!transactionId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
                    <p className="text-gray-500 mb-6">No transaction ID found in URL.</p>
                    <button onClick={() => navigate('/plans')} className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors">
                        Go Back to Plans
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h2>
                    </>
                )}
                
                {status === 'failed' && (
                    <>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
                    </>
                )}

                <p className="text-gray-500 mb-6">{message}</p>
                
                {status !== 'verifying' && (
                    <button onClick={() => navigate('/plans')} className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors">
                        Return to Plans
                    </button>
                )}
            </div>
        </div>
    );
};

export default PaymentCallback;
