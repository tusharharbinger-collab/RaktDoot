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

    // Development: automatically allow localhost, 127.0.0.1, and local private network origins
    if (process.env.NODE_ENV !== 'production') {
      if (/^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ─── CORE MIDDLEWARES ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── STATIC: UPLOADED ISSUE PHOTOS ───────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'delivery-tracking-api' });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/destinations', destinationsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/notifications', notificationsRoutes);

// ─── 404 FALLBACK ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
