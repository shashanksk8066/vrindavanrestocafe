import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditions = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Terms & Conditions</h1>
                <p className="text-gray-500 mb-8 text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
                
                <div className="prose prose-amber max-w-none text-gray-600">
                    <p className="mb-4">
                        These Terms and Conditions, along with privacy policy or other terms ("Terms"), constitute a binding agreement by and between Vrindavan Foods & Hospitality ("Website Owner" or "we" or "us" or "our") and you ("you" or "your") and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, "Services").
                    </p>
                    
                    <p className="mb-4">
                        By using our website and availing the Services, you agree that you have read and accepted these Terms (including the Privacy Policy). We reserve the right to modify these Terms at any time and without assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Use of Services</h2>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                        <li>To avail these Services, you must be 18 years or older, or under the supervision of a parent or guardian.</li>
                        <li>You must provide true, accurate, and complete information while registering or providing details.</li>
                        <li>The content of the pages of this website is for your general information and use only. It is subject to change without notice.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Payment and Pricing</h2>
                    <p className="mb-4">
                        All payments must be made at the time of placing an order or as per the payment options available. We accept payments through secure third-party payment gateways like Razorpay and PhonePe.
                    </p>
                    <p className="mb-4">
                        We reserve the right to change prices for our products and services without prior notice.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Accuracy of Information</h2>
                    <p className="mb-4">
                        Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Liability</h2>
                    <p className="mb-4">
                        Your use of any information or materials on our website and/or product pages is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through our website and/or product pages meet your specific requirements.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Intellectual Property</h2>
                    <p className="mb-4">
                        Our website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Jurisdiction</h2>
                    <p className="mb-4">
                        Any dispute arising out of use of our website and/or purchase with us and/or any engagement with us is subject to the laws of India.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
