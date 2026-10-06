import { Router } from 'express';
import {
  adminLogin,
  createDriver,
  uploadDocument,
  getDrivers,
  addDriverFamily,
} from '../controllers/adminController';

import { upload } from '../config/multer';

const router = Router();

// Admin Authentication
router.post('/login', adminLogin);

// Driver Profile Management
router.post('/create-driver', createDriver);
router.get('/drivers', getDrivers);

// Driver Vault Document Linkage & Supabase Storage File Upload
router.post('/upload-doc', upload.single('file'), uploadDocument);

// Family Management
router.post('/driver-family', addDriverFamily);

export default router;
