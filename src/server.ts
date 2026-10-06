import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes';
import driverRoutes from './routes/driverRoutes';
import authRoutes from './routes/authRoutes';

import path from 'path';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware Configuration
app.use(cors({
  origin: '*', // Allows configuration for web portal and mobile clients
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Assets
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Aaride Enterprise Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Root API Information
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to Aaride API',
    endpoints: {
      admin: {
        login: 'POST /api/admin/login',
        create_driver: 'POST /api/admin/create-driver',
        drivers: 'GET /api/admin/drivers',
        upload_doc: 'POST /api/admin/upload-doc',
        driver_family: 'POST /api/admin/driver-family',
      },
      driver: {
        login: 'POST /api/driver/login',
        vault: 'GET /api/driver/vault/:driverId',
        add_ledger: 'POST /api/driver/ledger',
        get_ledger: 'GET /api/driver/ledger/:driverId',
        family: 'GET /api/driver/family/:driverId',
      },
    },
  });
});

// Register Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Aaride Backend Server is running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});

export default app;
