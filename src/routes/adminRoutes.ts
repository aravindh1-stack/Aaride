import { Router, Request, Response, NextFunction } from 'express';
import {
  adminLogin,
  createDriver,
  uploadDocument,
  getDrivers,
  addDriverFamily,
} from '../controllers/adminController';

import { upload } from '../config/multer';

const router = Router();

// Middleware to safely handle multer errors without 500 crash
const safeUploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        console.error('[Multer Upload Error]:', err);
        res.status(400).json({
          success: false,
          error: err.message || 'File upload failed. Ensure the file is a valid PDF or image (max 25MB).',
        });
        return;
      }
      next();
    });
  };
};

// Admin Authentication
router.post('/login', adminLogin);

// Driver Profile Management
router.post('/create-driver', createDriver);
router.get('/drivers', getDrivers);

// Driver Vault Document Linkage & Supabase Storage File Upload
router.post('/upload-doc', safeUploadSingle('file'), uploadDocument);

// Family Management
router.post('/driver-family', addDriverFamily);

export default router;
