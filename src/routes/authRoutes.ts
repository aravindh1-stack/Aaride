import { Router } from 'express';
import { unifiedLogin } from '../controllers/authController';

const router = Router();

// POST /api/auth/login
router.post('/login', unifiedLogin);

export default router;
