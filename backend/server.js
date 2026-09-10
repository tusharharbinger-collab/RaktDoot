'use strict';
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./src/sockets/socket.handler');
const { initDB } = require('./src/db/database');

const PORT = process.env.PORT || 5000;

// Initialize database first
initDB();

// Auto-seed default demo accounts if missing
const { seedDatabase } = require('./src/db/seed');
seedDatabase(false).catch(err => console.error('[DB] Auto-seed error:', err));

// Initialize Supabase PostgreSQL Cloud Sync
const { initSupabaseSync } = require('./src/db/supabase_sync');
initSupabaseSync().catch(err => console.warn('[Supabase Sync Warning]:', err.message));

const httpServer = http.createServer(app);

// Initialize Socket.io on the same HTTP server
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  🚚  Delivery Tracking API              ║`);
  console.log(`║  🌐  http://localhost:${PORT}            ║`);
  console.log(`║  📡  Socket.io ready                    ║`);
  console.log('╚════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('SIGINT received — shutting down gracefully...');
  httpServer.close(() => process.exit(0));
});
