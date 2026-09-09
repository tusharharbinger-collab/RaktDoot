'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDB, dbRun, dbGet } = require('./database');

initDB();

const SALT_ROUNDS = 10;

const users = [
  // Admin
  {
    id: 'user-admin-001',
    name: 'Admin User',
    email: 'admin@delivery.com',
    password: 'admin123',
    role: 'admin',
    phone: '+91-9000000001',
    avatar_color: '#ef4444',
  },
  // Managers
  {
    id: 'user-mgr-001',
    name: 'Sarah Manager',
    email: 'manager@delivery.com',
    password: 'manager123',
    role: 'manager',
    phone: '+91-9000000002',
    avatar_color: '#8b5cf6',
  },
  // Drivers
  {
    id: 'user-drv-001',
    name: 'Ravi Kumar',
    email: 'driver1@delivery.com',
    password: 'driver123',
    role: 'driver',
    phone: '+91-9000000011',
    avatar_color: '#06b6d4',
  },
  {
    id: 'user-drv-002',
    name: 'Priya Sharma',
    email: 'driver2@delivery.com',
    password: 'driver123',
    role: 'driver',
    phone: '+91-9000000012',
    avatar_color: '#10b981',
  },
  {
    id: 'user-drv-003',
    name: 'Amit Patel',
    email: 'driver3@delivery.com',
    password: 'driver123',
    role: 'driver',
    phone: '+91-9000000013',
    avatar_color: '#f59e0b',
  },
  {
    id: 'user-drv-004',
    name: 'Neha Singh',
    email: 'driver4@delivery.com',
    password: 'driver123',
    role: 'driver',
    phone: '+91-9000000014',
    avatar_color: '#ec4899',
  },
  {
    id: 'user-drv-005',
    name: 'Kiran Rao',
    email: 'driver5@delivery.com',
    password: 'driver123',
    role: 'driver',
    phone: '+91-9000000015',
    avatar_color: '#84cc16',
  },
];

// Demo initial locations across Pune (around Swargate HQ at 18.5039, 73.8524)
const initialLocations = [
  { driver_id: 'user-drv-001', lat: 18.5080, lng: 73.8550, speed: 28, heading: 45,  status: 'active' }, // ~0.5 km (Inside 3km)
  { driver_id: 'user-drv-002', lat: 18.5204, lng: 73.8567, speed: 36, heading: 90,  status: 'active' }, // ~1.9 km (Inside 3km)
  { driver_id: 'user-drv-003', lat: 18.4900, lng: 73.8400, speed: 0,  heading: 0,   status: 'idle'   }, // ~2.0 km (Inside 3km)
  { driver_id: 'user-drv-004', lat: 18.5550, lng: 73.8100, speed: 48, heading: 270, status: 'active' }, // ~7.3 km (Inside 10km, outside 5km)
  { driver_id: 'user-drv-005', lat: 18.6280, lng: 73.8000, speed: 0,  heading: 180, status: 'issue'  }, // ~15.0 km (Inside 20km, outside 10km)
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  for (const u of users) {
    const existing = dbGet('SELECT id FROM users WHERE id = ?', [u.id]);
    if (existing) {
      console.log(`  ⚠️  User ${u.email} already exists — skipping`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, phone, avatar_color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, hash, u.role, u.phone, u.avatar_color]
    );
    console.log(`  ✅  Created ${u.role.padEnd(8)} → ${u.email} (password: ${u.password})`);
  }

  console.log('\n📍 Seeding driver locations...');
  for (const loc of initialLocations) {
    dbRun(
      `INSERT INTO driver_locations (driver_id, lat, lng, speed, heading, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(driver_id) DO UPDATE SET
         lat=excluded.lat, lng=excluded.lng,
         speed=excluded.speed, heading=excluded.heading,
         status=excluded.status, updated_at=datetime('now')`,
      [loc.driver_id, loc.lat, loc.lng, loc.speed, loc.heading, loc.status]
    );
    console.log(`  ✅  Location seeded for driver ${loc.driver_id}`);
  }

  console.log('\n🎯 Seeding sample destinations in Pune...');
  const sampleDestinations = [
    {
      id: 'dest-home-001',
      name: 'Jankalyan Blood Centre (Home Base)',
      address: 'Jankalyan Blood Donation Building, Swargate, Pune, Maharashtra 411042',
      lat: 18.5039,
      lng: 73.8524,
      radius_m: 500,
      description: 'Central Blood Bank & Donation Building. Dispatch starting point and manager operations center.',
      created_by: 'user-mgr-001',
      is_home: 1,
    },
    {
      id: 'dest-pune-sancheti',
      name: 'Sancheti Hospital',
      address: '16, Shivajinagar, Pune, Maharashtra 411005',
      lat: 18.5312,
      lng: 73.8528,
      radius_m: 500,
      description: 'Speciality Orthopaedic & Trauma Centre, Shivajinagar',
      created_by: 'user-mgr-001',
      is_home: 0,
    },
    {
      id: 'dest-pune-rubyhall',
      name: 'Ruby Hall Clinic',
      address: '40, Sassoon Rd, Sangamvadi, Pune, Maharashtra 411001',
      lat: 18.5326,
      lng: 73.8783,
      radius_m: 600,
      description: 'Major Super-Speciality Hospital & Research Centre, Pune Station',
      created_by: 'user-mgr-001',
      is_home: 0,
    },
    {
      id: 'dest-pune-deenanath',
      name: 'Deenanath Mangeshkar Hospital',
      address: 'Near Mhatre Bridge, Erandwane, Pune, Maharashtra 411004',
      lat: 18.4996,
      lng: 73.8290,
      radius_m: 500,
      description: 'Multi-speciality Hospital & Blood Transfusion Centre, Erandwane',
      created_by: 'user-mgr-001',
      is_home: 0,
    },
    {
      id: 'dest-pune-jehangir',
      name: 'Jehangir Hospital',
      address: '32, Sassoon Rd, Central Railway Colony, Pune, Maharashtra 411001',
      lat: 18.5284,
      lng: 73.8744,
      radius_m: 500,
      description: 'Acute Care & Emergency Medical Services, Sassoon Road',
      created_by: 'user-mgr-001',
      is_home: 0,
    },
  ];

  for (const dest of sampleDestinations) {
    const existing = dbGet('SELECT id FROM destinations WHERE id = ?', [dest.id]);
    if (!existing) {
      dbRun(`
        INSERT INTO destinations (id, name, address, lat, lng, radius_m, description, created_by, is_active, is_home)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [dest.id, dest.name, dest.address, dest.lat, dest.lng, dest.radius_m, dest.description, dest.created_by, dest.is_home || 0]);
      console.log(`  ✅  Destination created: ${dest.name}`);
    }
  }

  console.log('\n✨ Seed complete!');
  console.log('\nDemo Credentials:');
  console.log('  Admin:   admin@delivery.com     / admin123');
  console.log('  Manager: manager@delivery.com   / manager123');
  console.log('  Driver:  driver1@delivery.com   / driver123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
