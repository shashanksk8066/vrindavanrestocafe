const { db } = require('../config/firebaseAdmin');

const registerUser = async (req, res) => {
    try {
        const { uid, email, name, role } = req.body;
        
        // Ensure role is valid (default to customer if none provided, or restrict admin creation)
        const userRole = (role === 'admin' || role === 'delivery') ? role : 'customer';

        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();

        if (!doc.exists) {
            await userDocRef.set({
                uid,
                email,
                name,
                role: userRole,
                createdAt: new Date().toISOString(),
                savedAddresses: [],
                phone: ''
            });
        }

        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ success: false, message: 'Failed to register user' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const { uid } = req.user;
        const doc = await db.collection('users').doc(uid).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: doc.data() });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
};

module.exports = { registerUser, getUserProfile };
