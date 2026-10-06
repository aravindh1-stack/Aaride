import multer from 'multer';

// Memory storage keeps uploaded file buffers in memory for immediate streaming to Supabase Storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Allowed file types: PDF, PNG, JPEG, WEBP
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type! Please upload a PDF, PNG, JPG, or WEBP file.'));
    }
  },
});

export default upload;
