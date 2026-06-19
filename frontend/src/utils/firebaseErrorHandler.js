export const getFirebaseErrorMessage = (error) => {
    // If it's a custom error (like unauthorized role), just return its message
    if (!error.code) return error.message;

    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again or sign up.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account already exists with this email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed login attempts. Please try again later or reset your password.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/requires-recent-login':
            return 'For security reasons, please log out and log back in before performing this action.';
        default:
            return 'An unexpected authentication error occurred. Please try again later.';
    }
};
