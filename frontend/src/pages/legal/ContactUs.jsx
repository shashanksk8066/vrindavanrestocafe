import React from 'react';
import { ArrowLeft, Mail, Phone, MapPin, AtSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Contact Us</h1>
                
                <p className="text-gray-600 mb-8 leading-relaxed">
                    We'd love to hear from you! Whether you have a question about our menu, reservations, or anything else, our team is ready to answer all your questions.
                </p>

                <div className="space-y-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full">
                            <MapPin className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Our Location</h3>
                            <p className="mt-1 text-gray-600">Vrindavan Resto Cafe<br/>No 93 M.V.P Layout Acharya College Road<br/>Soladevanahalli, Bangalore North<br/>Bangalore Urban, Karnataka - 560107</p>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full">
                            <Phone className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Phone</h3>
                            <p className="mt-1 text-gray-600">+91 7813041177<br/>+91 7795846699</p>
                            <p className="text-sm text-gray-500">Mon-Sun 8am to 10pm</p>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full">
                            <Mail className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Email</h3>
                            <p className="mt-1 text-gray-600">contact@vrindavanrestocafe.com</p>
                            <p className="text-sm text-gray-500">We aim to reply within 24 hours.</p>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full">
                            <AtSign className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Instagram</h3>
                            <a href="https://instagram.com/vrindavan.resto.cafe" target="_blank" rel="noopener noreferrer" className="mt-1 text-amber-600 hover:text-amber-700">@vrindavan.resto.cafe</a>
                            <p className="text-sm text-gray-500">Follow us for updates and offers!</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Operating Entity</h3>
                    <p className="text-gray-600">
                        This website is operated by <strong>Vrindavan Foods & Hospitality</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
