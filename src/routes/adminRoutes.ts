import { Router } from 'express';
import {
  adminLogin,
  createDriver,
  uploadDocument,
  getDrivers,
  addDriverFamily,
} from '../controllers/adminController';

const router = Router();

// Admin Authentication
router.post('/login', adminLogin);

// Driver Profile Management
router.post('/create-driver', createDriver);
router.get('/drivers', getDrivers);

// Driver Vault Document Linkage
router.post('/upload-doc', uploadDocument);

// Family Management
router.post('/driver-family', addDriverFamily);

export default router;
