import SEO from '../../components/SEO';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RefundPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO 
                title="Refund Policy - Vrindavan Resto Cafe" 
                description="Read our refund and cancellation policy for orders and bookings."
                canonical="/refund"
            />
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Cancellation & Refund Policy</h1>
                <p className="text-gray-500 mb-8 text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
                
                <div className="prose prose-amber max-w-none text-gray-600">
                    <p className="mb-4">
                        Vrindavan Foods & Hospitality believes in helping its customers as far as possible, and has therefore a liberal cancellation policy.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Cancellations</h2>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                        <li>Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of preparing them.</li>
                        <li>Vrindavan Foods & Hospitality does not accept cancellation requests for perishable items like food and beverages once prepared. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Refunds</h2>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                        <li>In case of receipt of damaged or defective items, please report the same to our Customer Service team within 24 hours. The request will, however, be entertained once we have checked and determined the same at our own end.</li>
                        <li>In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 24 hours of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.</li>
                        <li>In case of any Refunds approved by Vrindavan Foods & Hospitality, it'll take 3-5 working days for the refund to be processed and credited to the end customer's original method of payment.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
