import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const useAuthStore = create((set) => ({
    user: null,
    userData: null,
    role: null, // 'customer', 'admin', 'delivery'
    loading: true,
    error: null,

    initAuth: () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        
                        // Retroactively add referral code if missing
                        if (!userData.referralCode) {
                            const newCode = 'VRIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                            await setDoc(docRef, { referralCode: newCode, successfulReferrals: 0, referralRewarded: false }, { merge: true });
                            userData.referralCode = newCode;
                        }
                        
                        set({ user: firebaseUser, userData: userData, role: userData.role || 'customer', loading: false });
                    } else {
                        // Fallback if doc doesn't exist yet
                        set({ user: firebaseUser, role: 'customer', loading: false });
                    }
                } catch (error) {
                    console.error("Error fetching user role", error);
                    set({ user: firebaseUser, role: 'customer', loading: false });
                }
            } else {
                set({ user: null, role: null, loading: false });
            }
        });
    },

    login: async (email, password, requiredRole = null) => {
        set({ loading: true, error: null });
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            let userRole = 'customer';
            let uData = null;
            
            // Ensure referral code
            if (docSnap.exists()) {
                uData = docSnap.data();
                userRole = uData.role || 'customer';
                
                // Retroactively add referral code if missing
                if (!uData.referralCode) {
                    const newCode = 'VRIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                    await setDoc(docRef, { referralCode: newCode, successfulReferrals: 0, referralRewarded: false }, { merge: true });
                    uData.referralCode = newCode;
                }
            }
            
            // Validate required role for separate login portals
            if (requiredRole && userRole !== requiredRole) {
                await signOut(auth); // force sign out
                throw new Error(`Unauthorized. This login portal is for ${requiredRole}s only.`);
            }

            set({ user: user, userData: uData, role: userRole, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    signup: async (email, password, name, phone, referredBy = '') => {
        set({ loading: true, error: null });
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const newCode = 'VRIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                name: name,
                role: 'customer',
                createdAt: new Date().toISOString(),
                savedAddresses: [],
                phone: phone || '',
                referralCode: newCode,
                referredBy: referredBy || '',
                successfulReferrals: 0,
                referralRewarded: false
            });

            if (referredBy) {
                // Record to referralHistory
                await setDoc(doc(db, 'referralHistory', user.uid), {
                    referrerCode: referredBy,
                    referredUserId: user.uid,
                    referredUserName: name || user.email,
                    status: 'registered', // Will change to 'subscribed' when they buy a >10 day plan
                    createdAt: new Date().toISOString()
                });
            }

            
            // Note: In a real app we might also hit the backend /api/auth/register
            
        } catch (error) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    logout: async () => {
        set({ loading: true });
        try {
            await signOut(auth);
            set({ user: null, userData: null, role: null, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    }
}));

export default useAuthStore;
