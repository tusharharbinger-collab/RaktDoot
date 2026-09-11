'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./src/modules/auth/auth.routes');
const driversRoutes = require('./src/modules/drivers/drivers.routes');
const issuesRoutes = require('./src/modules/issues/issues.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');
const destinationsRoutes = require('./src/modules/destinations/destinations.routes');
const assignmentsRoutes = require('./src/modules/assignments/assignments.routes');
const notificationsRoutes = require('./src/modules/notifications/notifications.routes');
const worklogsRoutes = require('./src/modules/worklogs/worklogs.routes');
const reportsRoutes = require('./src/modules/reports/reports.routes');
const bloodCategoriesRoutes = require('./src/modules/blood_categories/blood_categories.routes');
const { errorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8081,http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests without Origin header (curl, mobile apps, native Postman)
    if (!origin) return cb(null, true);

    // Automatically allow localhost, 127.0.0.1, and local private network origins
    if (/^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }

    // Allow wildcard, specific configured origin, or any onrender.com / vercel.app origin
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }

    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ─── CORE MIDDLEWARES ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── STATIC: UPLOADED ISSUE PHOTOS & DRIVER WEB APP ─────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use('/driver', express.static(path.resolve(__dirname, 'public/driver')));
app.use('/_expo', express.static(path.resolve(__dirname, 'public/driver/_expo')));
app.use('/assets', express.static(path.resolve(__dirname, 'public/driver/assets')));
app.use('/driver/assets', express.static(path.resolve(__dirname, 'public/driver/assets')));
app.get(['/driver', '/driver/*'], (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'public/driver/index.html'));
});

// Download Driver App Zip
app.use('/downloads', express.static(path.resolve(__dirname, 'public/downloads')));
app.get(['/download/driver-app', '/download-driver-app', '/download/driver-app.zip', '/download/raktdoot-driver-app.zip'], (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public/downloads/raktdoot-driver-app.zip');
  res.download(zipPath, 'raktdoot-driver-app.zip');
});

// Download Driver APK
app.get(['/download/apk', '/download/driver-apk', '/download/raktdoot-driver.apk', '/downloads/raktdoot-driver.apk', '/raktdoot-driver.apk'], (_req, res) => {
  const apkPath = path.resolve(__dirname, 'public/downloads/raktdoot-driver.apk');
  res.download(apkPath, 'raktdoot-driver.apk');
});

// ─── ROOT & HEALTH CHECK ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'RAKTDOOT TRACKER API',
    status: 'online',
    message: 'Backend API is running successfully!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'raktdoot-tracking-api' });
});

// ─── MANUAL / AUTOMATIC SEED TRIGGER ─────────────────────────────────────────
const { seedDatabase } = require('./src/db/seed');
app.all('/api/seed', async (_req, res) => {
  try {
    await seedDatabase(true);
    res.json({
      success: true,
      message: 'Database seeded successfully with demo users and locations!',
      credentials: [
        { role: 'admin', email: 'raktdoot@jankalyan.com', password: 'RDJK@1983' },
        { role: 'manager', email: 'tracker@jankalyan.com', password: 'RDJK@1983' },
      ],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/work-logs', worklogsRoutes);
app.use('/api/reports', reportsRoutes);
app.use(['/api/blood-categories', '/api/categories'], bloodCategoriesRoutes);

// ─── 404 FALLBACK ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
