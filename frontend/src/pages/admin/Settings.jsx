import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Settings = () => {
    const [settings, setSettings] = useState({
        aboutUs: '',
        privacyPolicy: '',
        terms: '',
        contactPhone: '',
        contactEmail: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'appSettings', 'global');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'appSettings', 'global'), settings);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings", error);
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-4">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
                <p className="text-gray-500">Manage global content and contact information</p>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input 
                                type="email" 
                                value={settings.contactEmail} 
                                onChange={e => setSettings({...settings, contactEmail: e.target.value})} 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-black focus:border-black" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input 
                                type="text" 
                                value={settings.contactPhone} 
                                onChange={e => setSettings({...settings, contactPhone: e.target.value})} 
                                className="w-full px-4 py-2 border rounded-lg focus:ring-black focus:border-black" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">About Us</label>
                        <textarea 
                            rows="4"
                            value={settings.aboutUs} 
                            onChange={e => setSettings({...settings, aboutUs: e.target.value})} 
                            className="w-full px-4 py-2 border rounded-lg focus:ring-black focus:border-black" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy</label>
                        <textarea 
                            rows="4"
                            value={settings.privacyPolicy} 
                            onChange={e => setSettings({...settings, privacyPolicy: e.target.value})} 
                            className="w-full px-4 py-2 border rounded-lg focus:ring-black focus:border-black" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                        <textarea 
                            rows="4"
                            value={settings.terms} 
                            onChange={e => setSettings({...settings, terms: e.target.value})} 
                            className="w-full px-4 py-2 border rounded-lg focus:ring-black focus:border-black" 
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
