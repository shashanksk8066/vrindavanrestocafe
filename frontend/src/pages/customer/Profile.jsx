import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { User, MapPin, Copy, Share2, LogOut, Edit2, Check, X, Plus, Trash2, Navigation, ShoppingBag, CalendarDays, Utensils, PartyPopper, Info, ChevronRight, Phone , Gift } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { calculateDistance } from '../../utils/distance';

const Profile = () => {
    const { user, userData, logout } = useAuthStore();
    
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: userData?.name || user?.displayName || '',
        phone: userData?.phone || ''
    });

    const [addresses, setAddresses] = useState([]);
    
    const RESTAURANT_LAT = parseFloat(import.meta.env.VITE_RESTAURANT_LAT) || 12.9716;
    const RESTAURANT_LNG = parseFloat(import.meta.env.VITE_RESTAURANT_LNG) || 77.5946;
    const MAX_RADIUS = parseFloat(import.meta.env.VITE_MAX_DELIVERY_RADIUS_KM) || 2;

    const [newAddress, setNewAddress] = useState({ label: 'Home', flatNumber: '', streetArea: '', landmark: '', lat: RESTAURANT_LAT, lng: RESTAURANT_LNG });
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    
    const distanceFromRestaurant = calculateDistance(RESTAURANT_LAT, RESTAURANT_LNG, newAddress.lat, newAddress.lng);
    const isServiceable = distanceFromRestaurant <= MAX_RADIUS;
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const fetchAddresses = useCallback(async () => {
        setLoadingAddresses(true);
        try {
            const q = query(collection(db, 'addresses'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const addressList = [];
            snapshot.forEach(doc => addressList.push({ id: doc.id, ...doc.data() }));
            setAddresses(addressList);
        } catch (error) {
            console.error("Error fetching addresses", error);
        } finally {
            setLoadingAddresses(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchAddresses();
        }
    }, [user, fetchAddresses]);

    const handleGetLocation = () => {
        setFetchingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setNewAddress(prev => ({
                        ...prev,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }));
                    setFetchingLocation(false);
                },
                (error) => {
                    console.error("Geolocation error", error);
                    alert("Could not get location. Please ensure location permissions are granted.");
                    setFetchingLocation(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
            setFetchingLocation(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to log out?')) {
            await logout();
        }
    };

    const saveProfile = async () => {
        try {
            await setDoc(doc(db, 'users', user.uid), {
                name: profileForm.name || '',
                phone: profileForm.phone || ''
            }, { merge: true });
            setIsEditingProfile(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile', error);
            alert('Failed to update profile');
        }
    };

    const addAddress = async () => {
        if (!isServiceable) return alert(`Selected location is outside our ${MAX_RADIUS}km delivery zone.`);
        if (!newAddress.label || !newAddress.streetArea || !newAddress.flatNumber) {
            return alert('Please fill in label, flat number, and street area.');
        }
        try {
            const fullAddress = `${newAddress.flatNumber}, ${newAddress.streetArea}${newAddress.landmark ? ', ' + newAddress.landmark : ''}`;
            const addressData = {
                ...newAddress,
                fullAddress,
                userId: user.uid,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'addresses'), addressData);
            setAddresses([...addresses, { id: docRef.id, ...addressData }]);
            setIsAddingAddress(false);
            setNewAddress({ label: 'Home', flatNumber: '', streetArea: '', landmark: '', lat: RESTAURANT_LAT, lng: RESTAURANT_LNG });
        } catch (error) {
            console.error('Error adding address', error);
            alert('Failed to add address');
        }
    };

    const removeAddress = async (id) => {
        if (window.confirm('Remove this address?')) {
            try {
                await deleteDoc(doc(db, 'addresses', id));
                setAddresses(addresses.filter(a => a.id !== id));
            } catch (error) {
                console.error("Error removing address", error);
                alert("Failed to remove address");
            }
        }
    };

    return (
        <div className="p-4 md:p-0 max-w-2xl mx-auto space-y-6 pb-20">
            {/* Header / Profile Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl shadow-inner">
                        {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : <User className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                        {!isEditingProfile ? (
                            <>
                                <h1 className="text-xl font-bold text-gray-900">{profileForm.name || 'Valued Customer'}</h1>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                                <p className="text-sm text-gray-500 mt-1">{profileForm.phone || 'No phone number'}</p>
                            </>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border-b border-gray-300 focus:border-black outline-none py-1 text-sm font-semibold text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Email (Cannot be changed)</label>
                                    <input type="email" value={user?.email || ''} disabled className="w-full border-b border-gray-100 bg-transparent py-1 text-sm text-gray-400 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Phone</label>
                                    <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border-b border-gray-300 focus:border-black outline-none py-1 text-sm text-gray-900" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-end">
                    {!isEditingProfile ? (
                        <button onClick={() => setIsEditingProfile(true)} className="flex items-center text-orange-500 font-semibold text-sm hover:text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                            <Edit2 className="w-4 h-4 mr-1.5" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button onClick={() => setIsEditingProfile(false)} className="flex items-center text-gray-500 font-semibold text-sm hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                                <X className="w-4 h-4 mr-1.5" /> Cancel
                            </button>
                            <button onClick={saveProfile} className="flex items-center text-white font-semibold text-sm bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg">
                                <Check className="w-4 h-4 mr-1.5" /> Save
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Saved Addresses */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <h2 className="font-bold text-gray-900 text-lg">Saved Addresses</h2>
                    </div>
                    {!isAddingAddress && (
                        <button onClick={() => setIsAddingAddress(true)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="space-y-4 mt-4">
                    {loadingAddresses ? (
                        <p className="text-sm text-gray-500">Loading addresses...</p>
                    ) : (
                        <>
                            {addresses.map((addr) => (
                                <div key={addr.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-sm">{addr.label}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{addr.fullAddress}</p>
                                    </div>
                                    <button onClick={() => removeAddress(addr.id)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {addresses.length === 0 && !isAddingAddress && (
                                <p className="text-sm text-gray-500 italic">No saved addresses found.</p>
                            )}
                        </>
                    )}

                    {isAddingAddress && (
                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3 relative overflow-hidden">
                            {/* Map Section */}
                            <div className="relative h-48 w-full rounded-xl overflow-hidden bg-gray-100 border border-blue-200">
                                {/* Serviceability Overlay Badge */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap">
                                    {isServiceable ? (
                                        <div className="bg-green-500 text-white px-3 py-1 rounded-full shadow-lg font-bold text-xs flex items-center">
                                            <Check className="w-3 h-3 mr-1" /> Service Available
                                        </div>
                                    ) : (
                                        <div className="bg-red-500 text-white px-3 py-1 rounded-full shadow-lg font-bold text-xs flex items-center">
                                            <X className="w-3 h-3 mr-1" /> Outside {MAX_RADIUS}km Zone
                                        </div>
                                    )}
                                </div>
                                {isLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ height: '100%', width: '100%' }}
                                        center={{ lat: newAddress.lat, lng: newAddress.lng }}
                                        zoom={14}
                                        options={{ disableDefaultUI: true, zoomControl: true }}
                                    >
                                        <Marker 
                                            draggable={true}
                                            position={{ lat: newAddress.lat, lng: newAddress.lng }}
                                            onDragEnd={(e) => {
                                                setNewAddress(prev => ({
                                                    ...prev,
                                                    lat: e.latLng.lat(),
                                                    lng: e.latLng.lng()
                                                }));
                                            }}
                                        />
                                        <Circle 
                                            center={{ lat: RESTAURANT_LAT, lng: RESTAURANT_LNG }}
                                            radius={MAX_RADIUS * 1000}
                                            options={{
                                                fillColor: "#22c55e",
                                                fillOpacity: 0.1,
                                                strokeColor: "#22c55e",
                                                strokeOpacity: 0.8,
                                                strokeWeight: 2,
                                                clickable: false,
                                                interactive: false
                                            }}
                                        />
                                    </GoogleMap>
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium text-sm">Loading Map...</div>
                                )}
                                <button 
                                    type="button"
                                    onClick={handleGetLocation}
                                    disabled={fetchingLocation}
                                    className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full shadow-md hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
                                    title="Locate Me"
                                >
                                    <Navigation className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div>
                                    <label className="text-xs text-blue-700 font-medium">Label (e.g. Home)</label>
                                    <input type="text" value={newAddress.label} onChange={e => setNewAddress({...newAddress, label: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500" placeholder="Home" />
                                </div>
                                <div>
                                    <label className="text-xs text-blue-700 font-medium">Flat / House No.</label>
                                    <input type="text" value={newAddress.flatNumber} onChange={e => setNewAddress({...newAddress, flatNumber: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500" placeholder="4B" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-blue-700 font-medium">Street / Area</label>
                                <textarea value={newAddress.streetArea} onChange={e => setNewAddress({...newAddress, streetArea: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500" placeholder="123 Main St" rows="2" />
                            </div>
                            <div>
                                <label className="text-xs text-blue-700 font-medium">Landmark (Optional)</label>
                                <input type="text" value={newAddress.landmark} onChange={e => setNewAddress({...newAddress, landmark: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-blue-500" placeholder="Near Apollo Hospital" />
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button onClick={() => setIsAddingAddress(false)} className="text-sm text-gray-500 px-3 py-1.5 hover:bg-white rounded-lg">Cancel</button>
                                <button onClick={addAddress} disabled={!isServiceable} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">Save Address</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
                        {/* Referral Program */}
            {userData?.referralCode && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-sm overflow-hidden p-6 text-white relative">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Gift className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Share2 className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="font-bold text-lg">Refer & Earn</h2>
                        </div>
                        <p className="text-white/80 text-sm mb-5">Share your code with friends. When they subscribe, you earn rewards!</p>
                        
                        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20 flex justify-between items-center mb-4">
                            <div>
                                <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">Your Referral Code</p>
                                <p className="text-xl font-bold tracking-widest">{userData.referralCode}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userData.referralCode}`);
                                    alert('Referral link copied to clipboard!');
                                }}
                                className="bg-white text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                                title="Copy Referral Link"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-white/80">Successful Referrals:</span>
                            <span className="text-2xl font-black bg-white/20 px-4 py-1 rounded-full">{userData.successfulReferrals || 0}</span>
                        </div>
                        <Link to="/referrals" className="mt-4 block w-full text-center bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 rounded-xl transition-colors backdrop-blur-sm border border-white/10">
                            View Referral Dashboard
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Links Dashboard */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900 text-lg ml-2">My Activity</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    <Link to="/rewards" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Gift className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">My Rewards</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                    </Link>

                    <Link to="/orders" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">My Orders</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                    </Link>

                    <Link to="/plans" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">Meal Plans</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </Link>

                    <Link to="/menu" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Utensils className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">Main Menu</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                    </Link>

                    <Link to="/catering" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                                <PartyPopper className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">Catering Services</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                    </Link>

                    <Link to="/events" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Check className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">Special Events</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-pink-500 transition-colors" />
                    </Link>

                    <Link to="/about" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Info className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-gray-800">About Us</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 mt-8">
                <button 
                    onClick={handleLogout}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold py-4 rounded-2xl flex items-center justify-center transition-colors shadow-sm"
                >
                    <LogOut className="w-5 h-5 mr-2" /> Log Out
                </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 pt-4 pb-8">Vrindavan Resto Cafe v1.0.0</p>
        </div>
    );
};

export default Profile;
