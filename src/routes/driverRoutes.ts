import { Router } from 'express';
import {
  driverLogin,
  getDriverVault,
  updateDriverDocument,
  addLedgerEntry,
  getDriverLedger,
  getDriverFamily,
} from '../controllers/driverController';

const router = Router();

// Driver Authentication
router.post('/login', driverLogin);

// Document Vault
router.get('/vault/:driverId', getDriverVault);
router.put('/document/:docId', updateDriverDocument); // Edit issue_date, expiry_date, doc_number ONLY

// Daily Ledger & Financials
router.post('/ledger', addLedgerEntry);
router.get('/ledger/:driverId', getDriverLedger);

// Family Details
router.get('/family/:driverId', getDriverFamily);

export default router;
