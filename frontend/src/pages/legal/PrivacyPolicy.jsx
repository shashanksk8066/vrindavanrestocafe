import SEO from '../../components/SEO';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO 
                title="Privacy Policy - Vrindavan Resto Cafe" 
                description="Learn how Vrindavan Resto Cafe handles and protects your personal data."
                canonical="/privacy"
            />
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
                <p className="text-gray-500 mb-8 text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
                
                <div className="prose prose-amber max-w-none text-gray-600">
                    <p className="mb-4">
                        This privacy policy sets out how Vrindavan Foods & Hospitality uses and protects any information that you give us when you use this website. We are committed to ensuring that your privacy is protected. Should we ask you to provide certain information by which you can be identified when using this website, then you can be assured that it will only be used in accordance with this privacy statement.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Information We Collect</h2>
                    <p className="mb-2">We may collect the following information:</p>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                        <li>Name and job title</li>
                        <li>Contact information including email address and phone number</li>
                        <li>Demographic information such as postcode, preferences and interests</li>
                        <li>Other information relevant to customer surveys and/or offers</li>
                    </ul>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">What We Do With the Information</h2>
                    <p className="mb-2">We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:</p>
                    <ul className="list-disc pl-5 mb-6 space-y-2">
                        <li>Internal record keeping.</li>
                        <li>We may use the information to improve our products and services.</li>
                        <li>We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Security</h2>
                    <p className="mb-4">
                        We are committed to ensuring that your information is secure. In order to prevent unauthorized access or disclosure, we have put in place suitable physical, electronic and managerial procedures to safeguard and secure the information we collect online.
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Payment Information</h2>
                    <p className="mb-4">
                        We do not store your credit/debit card details or any other payment information on our servers. All online transactions are processed through secure, PCI-DSS compliant third-party payment gateways (such as Razorpay).
                    </p>

                    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Contacting Us</h2>
                    <p className="mb-4">
                        If there are any questions regarding this privacy policy, you may contact us using the information provided on our Contact Us page.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
