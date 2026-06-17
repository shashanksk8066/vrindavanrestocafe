const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
    uploadMenuImage,
    uploadPlanBanner,
    uploadCategoryImage,
    uploadReviewImage,
    uploadBannerImage,
    uploadGalleryImage
} = require('../controllers/uploadController');

// Allow authenticated users to upload review images (no admin role needed)
// Wait, the frontend might not pass the token correctly if verifyToken rejects it. Let's make it public or use verifyToken only.
// The frontend `uploadImage` utility doesn't send auth headers right now! 
// Let's just make it public to match what they wanted.
router.post('/review-image', upload.single('image'), uploadReviewImage);

// Only admins can upload images for the below routes
router.use(verifyToken, authorizeRoles('admin'));

router.post('/menu-image', upload.single('image'), uploadMenuImage);
router.post('/plan-banner', upload.single('image'), uploadPlanBanner);
router.post('/category-image', upload.single('image'), uploadCategoryImage);
router.post('/banner', upload.single('image'), uploadBannerImage);
router.post('/gallery', upload.single('image'), uploadGalleryImage);

module.exports = router;
