const { auth, db } = require('../config/firebaseAdmin');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        
        // Fetch user role from Firestore
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        let role = 'customer';
        
        if (userDoc.exists) {
            role = userDoc.data().role || 'customer';
        }

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: role
        };

        next();
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(403).json({ success: false, message: 'Unauthorized: Invalid token' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRoles };
