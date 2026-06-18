const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const processAndSaveImage = async (req, res, folderName) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
        // Navigate up from src/controllers to the root backend dir, then to public/uploads
        const dirPath = path.join(__dirname, '../../public/uploads', folderName);
        
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, filename);

        await sharp(req.file.buffer)
            .webp({ quality: 80 })
            .resize({ width: 800, withoutEnlargement: true }) // Optimize size
            .toFile(filePath);

        const publicUrl = `/api/uploads/${folderName}/${filename}`;

        res.status(200).json({ success: true, url: publicUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
};

const uploadMenuImage = (req, res) => processAndSaveImage(req, res, 'menu');
const uploadPlanBanner = (req, res) => processAndSaveImage(req, res, 'plans');
const uploadCategoryImage = (req, res) => processAndSaveImage(req, res, 'categories');
const uploadReviewImage = (req, res) => processAndSaveImage(req, res, 'reviews');
const uploadBannerImage = (req, res) => processAndSaveImage(req, res, 'banners');
const uploadGalleryImage = (req, res) => processAndSaveImage(req, res, 'gallery');

module.exports = {
    uploadMenuImage,
    uploadPlanBanner,
    uploadCategoryImage,
    uploadReviewImage,
    uploadBannerImage,
    uploadGalleryImage
};
