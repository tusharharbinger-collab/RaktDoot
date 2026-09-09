'use strict';
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../../db/database');

/**
 * Get all active destinations with creator and currently assigned driver (if any).
 */
function getAllDestinations() {
  return dbAll(`
    SELECT
      d.id, d.name, d.address, d.lat, d.lng, d.radius_m, d.description, d.is_home,
      d.created_by, d.is_active, d.created_at, d.updated_at,
      u_creator.name AS created_by_name,
      da.id AS active_assignment_id,
      da.status AS assignment_status,
      da.assigned_at,
      u_driver.id AS assigned_driver_id,
      u_driver.name AS assigned_driver_name,
      u_driver.avatar_color AS assigned_driver_avatar,
      dl.status AS driver_location_status,
      dl.lat AS driver_lat,
      dl.lng AS driver_lng
    FROM destinations d
    LEFT JOIN users u_creator ON u_creator.id = d.created_by
    LEFT JOIN driver_assignments da ON da.destination_id = d.id AND da.status IN ('pending', 'accepted', 'in_progress')
    LEFT JOIN users u_driver ON u_driver.id = da.driver_id
    LEFT JOIN driver_locations dl ON dl.driver_id = da.driver_id
    WHERE d.is_active = 1
    ORDER BY d.is_home DESC, d.created_at DESC
  `);
}

/**
 * Get the permanent Home Location (Blood Donation Building / Central Dispatch HQ).
 */
function getHomeDestination() {
  const home = dbGet(`
    SELECT
      d.id, d.name, d.address, d.lat, d.lng, d.radius_m, d.description, d.is_home,
      d.created_by, d.is_active, d.created_at, d.updated_at
    FROM destinations d
    WHERE d.is_home = 1 AND d.is_active = 1
    LIMIT 1
  `);

  if (home) return home;

  // Safe fallback
  return {
    id: 'dest-home-001',
    name: 'Jankalyan Blood Centre (Home Base)',
    address: 'Jankalyan Blood Donation Building, Central Complex, Mumbai',
    lat: 19.0760,
    lng: 72.8777,
    radius_m: 500,
    description: 'Central Blood Bank & Donation Building. Dispatch starting point and manager operations center.',
    is_home: 1,
    is_active: 1,
  };
}

/**
 * Get a single destination by ID with details.
 */
function getDestinationById(id) {
  const dest = dbGet(`
    SELECT
      d.id, d.name, d.address, d.lat, d.lng, d.radius_m, d.description, d.is_home,
      d.created_by, d.is_active, d.created_at, d.updated_at,
      u_creator.name AS created_by_name,
      da.id AS active_assignment_id,
      da.status AS assignment_status,
      da.assigned_at,
      u_driver.id AS assigned_driver_id,
      u_driver.name AS assigned_driver_name,
      u_driver.avatar_color AS assigned_driver_avatar,
      dl.status AS driver_location_status,
      dl.lat AS driver_lat,
      dl.lng AS driver_lng
    FROM destinations d
    LEFT JOIN users u_creator ON u_creator.id = d.created_by
    LEFT JOIN driver_assignments da ON da.destination_id = d.id AND da.status IN ('pending', 'accepted', 'in_progress')
    LEFT JOIN users u_driver ON u_driver.id = da.driver_id
    LEFT JOIN driver_locations dl ON dl.driver_id = da.driver_id
    WHERE d.id = ? AND d.is_active = 1
  `, [id]);

  if (!dest) {
    const err = new Error('Destination not found');
    err.status = 404;
    throw err;
  }
  return dest;
}

/**
 * Create a new destination.
 */
function createDestination({ name, address, lat, lng, radius_m = 500, description, created_by }) {
  if (!name || lat == null || lng == null) {
    const err = new Error('Name, latitude, and longitude are required');
    err.status = 400;
    throw err;
  }

  const id = uuidv4();
  const radius = parseFloat(radius_m) || 500;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  dbRun(`
    INSERT INTO destinations (id, name, address, lat, lng, radius_m, description, created_by, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [id, name.trim(), address ? address.trim() : null, latitude, longitude, radius, description ? description.trim() : null, created_by]);

  return getDestinationById(id);
}

/**
 * Update an existing destination.
 */
function updateDestination(id, fields) {
  const dest = getDestinationById(id);
  if (!dest) {
    const err = new Error('Destination not found');
    err.status = 404;
    throw err;
  }

  const name = fields.name !== undefined ? fields.name.trim() : dest.name;
  const address = fields.address !== undefined ? (fields.address ? fields.address.trim() : null) : dest.address;
  const lat = fields.lat !== undefined ? parseFloat(fields.lat) : dest.lat;
  const lng = fields.lng !== undefined ? parseFloat(fields.lng) : dest.lng;
  const radius_m = fields.radius_m !== undefined ? parseFloat(fields.radius_m) : dest.radius_m;
  const description = fields.description !== undefined ? (fields.description ? fields.description.trim() : null) : dest.description;

  dbRun(`
    UPDATE destinations SET
      name = ?,
      address = ?,
      lat = ?,
      lng = ?,
      radius_m = ?,
      description = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [name, address, lat, lng, radius_m, description, id]);

  return getDestinationById(id);
}

/**
 * Soft delete a destination and cancel any active assignments.
 */
function deleteDestination(id) {
  const dest = getDestinationById(id);
  if (!dest) {
    const err = new Error('Destination not found');
    err.status = 404;
    throw err;
  }

  dbRun(`UPDATE destinations SET is_active = 0, updated_at = datetime('now') WHERE id = ?`, [id]);
  dbRun(`UPDATE driver_assignments SET status = 'cancelled', updated_at = datetime('now') WHERE destination_id = ? AND status IN ('pending', 'accepted', 'in_progress')`, [id]);

  return { id, success: true };
}

module.exports = {
  getAllDestinations,
  getHomeDestination,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
};
