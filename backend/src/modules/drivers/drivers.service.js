'use strict';
const { dbAll, dbGet, dbRun } = require('../../db/database');

/**
 * Get all drivers with their latest location data.
 */
function getAllDriversWithLocations() {
  return dbAll(`
    SELECT
      u.id, u.name, u.email, u.phone, u.avatar_color, u.vehicle_type, u.vehicle_number,
      dl.lat, dl.lng, dl.speed, dl.heading, dl.status, dl.address, dl.updated_at
    FROM users u
    LEFT JOIN driver_locations dl ON dl.driver_id = u.id
    WHERE u.role = 'driver' AND u.is_active = 1
    ORDER BY u.name ASC
  `);
}

/**
 * Get a single driver with location and recent history.
 */
function getDriverById(driverId) {
  const driver = dbGet(`
    SELECT
      u.id, u.name, u.email, u.phone, u.avatar_color, u.created_at, u.vehicle_type, u.vehicle_number,
      dl.lat, dl.lng, dl.speed, dl.heading, dl.status, dl.address, dl.updated_at
    FROM users u
    LEFT JOIN driver_locations dl ON dl.driver_id = u.id
    WHERE u.id = ? AND u.role = 'driver'
  `, [driverId]);

  if (!driver) {
    const err = new Error('Driver not found.');
    err.status = 404;
    throw err;
  }

  const history = dbAll(`
    SELECT lat, lng, speed, heading, recorded_at
    FROM location_history
    WHERE driver_id = ?
    ORDER BY recorded_at DESC
    LIMIT 50
  `, [driverId]);

  const issues = dbAll(`
    SELECT id, description, image_path, status, created_at
    FROM issues
    WHERE driver_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `, [driverId]);

  return { ...driver, history, issues };
}

/**
 * Update driver status (active, idle, offline).
 */
function updateDriverStatus(driverId, status) {
  const valid = ['active', 'idle', 'issue', 'offline'];
  if (!valid.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
    err.status = 400;
    throw err;
  }

  dbRun(`
    UPDATE driver_locations SET status = ?, updated_at = datetime('now')
    WHERE driver_id = ?
  `, [status, driverId]);

  return { driverId, status };
}

/**
 * Upsert driver GPS location (used by socket handler too).
 */
function upsertLocation({ driver_id, lat, lng, speed = 0, heading = 0, status = 'active', address = null }) {
  dbRun(`
    INSERT INTO driver_locations (driver_id, lat, lng, speed, heading, status, address, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(driver_id) DO UPDATE SET
      lat = excluded.lat,
      lng = excluded.lng,
      speed = excluded.speed,
      heading = excluded.heading,
      status = excluded.status,
      address = COALESCE(excluded.address, driver_locations.address),
      updated_at = datetime('now')
  `, [driver_id, lat, lng, speed, heading, status, address]);

  // Store in history (throttled — only if enough movement)
  dbRun(`
    INSERT INTO location_history (driver_id, lat, lng, speed, heading)
    VALUES (?, ?, ?, ?, ?)
  `, [driver_id, lat, lng, speed, heading]);
}

/**
 * Update driver profile (vehicle_type, vehicle_number, phone, name).
 */
function updateDriverProfile(driverId, { vehicle_type, vehicle_number, phone, name }) {
  const driver = dbGet("SELECT * FROM users WHERE id = ? AND role = 'driver'", [driverId]);
  if (!driver) {
    const err = new Error('Driver not found.');
    err.status = 404;
    throw err;
  }

  const updates = [];
  const params = [];

  if (vehicle_type !== undefined) {
    const validTypes = ['two_wheeler', 'four_wheeler'];
    if (!validTypes.includes(vehicle_type)) {
      const err = new Error(`Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`);
      err.status = 400;
      throw err;
    }
    updates.push('vehicle_type = ?');
    params.push(vehicle_type);
  }

  if (vehicle_number !== undefined) {
    updates.push('vehicle_number = ?');
    params.push(vehicle_number ? vehicle_number.trim().toUpperCase() : null);
  }

  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone ? phone.trim() : null);
  }

  if (name !== undefined && name.trim()) {
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (updates.length > 0) {
    params.push(driverId);
    dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return dbGet(`
    SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_color, u.vehicle_type, u.vehicle_number, u.is_active, u.created_at,
           dl.lat, dl.lng, dl.speed, dl.heading, dl.status, dl.address, dl.updated_at
    FROM users u
    LEFT JOIN driver_locations dl ON dl.driver_id = u.id
    WHERE u.id = ?
  `, [driverId]);
}

module.exports = {
  getAllDriversWithLocations,
  getDriverById,
  updateDriverStatus,
  upsertLocation,
  updateDriverProfile,
};
