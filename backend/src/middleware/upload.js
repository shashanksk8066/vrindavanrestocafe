const multer = require('multer');

const storage = multer.memoryStorage(); // Store in memory temporarily for Sharp to process

const fileFilter = (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.originalname.toLowerCase().endsWith('.heic')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image or video!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit to allow short videos // 10MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
