const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const processAndSaveImage = async (req, res, folderName) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const isVideo = req.file.mimetype.startsWith('video/');
        const isHeic = req.file.originalname.toLowerCase().endsWith('.heic');
        
        let ext = '.webp';
        if (isVideo) {
            const originalExt = path.extname(req.file.originalname) || '.mp4';
            ext = originalExt;
        } else if (isHeic) {
            ext = '.heic';
        }

        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const dirPath = path.join(__dirname, '../../public/uploads', folderName);
        
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, filename);

        if (isVideo || isHeic) {
            // Write buffer directly to disk for videos and HEIC
            fs.writeFileSync(filePath, req.file.buffer);
        } else {
            // Process standard images via sharp
            try {
                await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .resize({ width: 800, withoutEnlargement: true })
                    .toFile(filePath);
            } catch (sharpError) {
                console.warn('Sharp processing failed, falling back to direct write', sharpError.message);
                const originalExt = path.extname(req.file.originalname) || '.jpg';
                const fallbackFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${originalExt}`;
                const fallbackPath = path.join(dirPath, fallbackFilename);
                fs.writeFileSync(fallbackPath, req.file.buffer);
                const publicUrl = `/api/uploads/${folderName}/${fallbackFilename}`;
                return res.status(200).json({ success: true, url: publicUrl });
            }
        }

        const publicUrl = `/api/uploads/${folderName}/${filename}`;
        res.status(200).json({ success: true, url: publicUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
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
