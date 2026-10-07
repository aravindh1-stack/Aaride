import multer from 'multer';
import path from 'path';

// Memory storage keeps uploaded file buffers in memory for immediate streaming to Supabase Storage
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.jfif', '.bmp', '.tiff'];
    const validMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'image/pjpeg',
      'image/jfif',
      'image/bmp',
      'application/octet-stream',
    ];

    if (validMimes.includes(file.mimetype.toLowerCase()) || validExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not supported. Please upload a PDF or image.`));
    }
  },
});

export default upload;
