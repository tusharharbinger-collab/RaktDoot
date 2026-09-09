'use strict';
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../../db/database');

/**
 * Get an assignment by ID with destination and driver details.
 */
function getAssignmentById(id) {
  const assignment = dbGet(`
    SELECT
      da.id, da.destination_id, da.driver_id, da.assigned_by, da.status,
      da.source_name, da.source_lat, da.source_lng, da.urgency, da.notes,
      da.assigned_at, da.accepted_at, da.completed_at, da.updated_at,
      d.name AS destination_name, d.address AS destination_address,
      d.lat AS destination_lat, d.lng AS destination_lng, d.radius_m AS destination_radius_m,
      d.description AS destination_description,
      u_driver.name AS driver_name, u_driver.email AS driver_email, u_driver.phone AS driver_phone,
      u_driver.avatar_color AS driver_avatar,
      u_mgr.name AS assigned_by_name,
      dl.lat AS driver_lat, dl.lng AS driver_lng, dl.status AS driver_location_status
    FROM driver_assignments da
    JOIN destinations d ON d.id = da.destination_id
    JOIN users u_driver ON u_driver.id = da.driver_id
    JOIN users u_mgr ON u_mgr.id = da.assigned_by
    LEFT JOIN driver_locations dl ON dl.driver_id = da.driver_id
    WHERE da.id = ?
  `, [id]);

  if (!assignment) {
    const err = new Error('Assignment not found');
    err.status = 404;
    throw err;
  }
  return assignment;
}

/**
 * Get all assignments with optional filtering.
 */
function getAllAssignments({ status, driver_id, destination_id, limit = 50 } = {}) {
  let sql = `
    SELECT
      da.id, da.destination_id, da.driver_id, da.assigned_by, da.status,
      da.source_name, da.source_lat, da.source_lng, da.urgency, da.notes,
      da.assigned_at, da.accepted_at, da.completed_at, da.updated_at,
      d.name AS destination_name, d.address AS destination_address,
      d.lat AS destination_lat, d.lng AS destination_lng, d.radius_m AS destination_radius_m,
      u_driver.name AS driver_name, u_driver.email AS driver_email, u_driver.phone AS driver_phone,
      u_driver.avatar_color AS driver_avatar,
      u_mgr.name AS assigned_by_name
    FROM driver_assignments da
    JOIN destinations d ON d.id = da.destination_id
    JOIN users u_driver ON u_driver.id = da.driver_id
    JOIN users u_mgr ON u_mgr.id = da.assigned_by
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND da.status = ?';
    params.push(status);
  }
  if (driver_id) {
    sql += ' AND da.driver_id = ?';
    params.push(driver_id);
  }
  if (destination_id) {
    sql += ' AND da.destination_id = ?';
    params.push(destination_id);
  }

  sql += ' ORDER BY da.assigned_at DESC LIMIT ?';
  params.push(parseInt(limit) || 50);

  return dbAll(sql, params);
}

/**
 * Get the currently active assignment for a driver.
 */
function getActiveAssignmentForDriver(driverId) {
  const assignment = dbGet(`
    SELECT
      da.id, da.destination_id, da.driver_id, da.assigned_by, da.status,
      da.source_name, da.source_lat, da.source_lng, da.urgency, da.notes,
      da.assigned_at, da.accepted_at, da.completed_at, da.updated_at,
      d.name AS destination_name, d.address AS destination_address,
      d.lat AS destination_lat, d.lng AS destination_lng, d.radius_m AS destination_radius_m,
      d.description AS destination_description,
      u_mgr.name AS assigned_by_name
    FROM driver_assignments da
    JOIN destinations d ON d.id = da.destination_id
    JOIN users u_mgr ON u_mgr.id = da.assigned_by
    WHERE da.driver_id = ? AND da.status IN ('pending', 'accepted', 'in_progress')
    ORDER BY da.assigned_at DESC
    LIMIT 1
  `, [driverId]);

  return assignment || null;
}

/**
 * Assign a driver to a destination / create a blood collection request.
 */
function createAssignment({
  destination_id,
  driver_id,
  assigned_by,
  source_name = 'Jankalyan Blood Centre (Swargate HQ)',
  source_lat = 18.5039,
  source_lng = 73.8524,
  urgency = 'normal',
  notes = null,
}) {
  if (!destination_id || !driver_id) {
    const err = new Error('destination_id and driver_id are required');
    err.status = 400;
    throw err;
  }

  const destination = dbGet('SELECT id, is_active FROM destinations WHERE id = ?', [destination_id]);
  if (!destination || !destination.is_active) {
    const err = new Error('Destination not found or inactive');
    err.status = 404;
    throw err;
  }

  const driver = dbGet("SELECT id, role, is_active FROM users WHERE id = ? AND role = 'driver' AND is_active = 1", [driver_id]);
  if (!driver) {
    const err = new Error('Driver not found or inactive');
    err.status = 404;
    throw err;
  }

  // Cancel any existing pending/active assignments for this driver
  dbRun(`
    UPDATE driver_assignments
    SET status = 'cancelled', updated_at = datetime('now')
    WHERE driver_id = ? AND status IN ('pending', 'accepted', 'in_progress')
  `, [driver_id]);

  // Cancel any existing pending/active assignments for this destination
  dbRun(`
    UPDATE driver_assignments
    SET status = 'cancelled', updated_at = datetime('now')
    WHERE destination_id = ? AND status IN ('pending', 'accepted', 'in_progress')
  `, [destination_id]);

  const id = uuidv4();
  dbRun(`
    INSERT INTO driver_assignments (
      id, destination_id, driver_id, assigned_by, status,
      source_name, source_lat, source_lng, urgency, notes
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `, [
    id,
    destination_id,
    driver_id,
    assigned_by,
    source_name || 'Jankalyan Blood Centre (Swargate HQ)',
    parseFloat(source_lat) || 18.5039,
    parseFloat(source_lng) || 73.8524,
    urgency || 'normal',
    notes || null,
  ]);

  return getAssignmentById(id);
}

/**
 * Update status of an assignment.
 */
function updateAssignmentStatus(id, newStatus, userId, userRole) {
  const valid = ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'];
  if (!valid.includes(newStatus)) {
    const err = new Error(`Invalid status. Must be one of: ${valid.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const assignment = getAssignmentById(id);
  if (!assignment) {
    const err = new Error('Assignment not found');
    err.status = 404;
    throw err;
  }

  // If driver is updating, verify driver ownership
  if (userRole === 'driver' && assignment.driver_id !== userId) {
    const err = new Error('Unauthorized to update this assignment');
    err.status = 403;
    throw err;
  }

  let acceptedAtUpdate = assignment.accepted_at;
  let completedAtUpdate = assignment.completed_at;

  if (newStatus === 'accepted' && !assignment.accepted_at) {
    acceptedAtUpdate = new Date().toISOString();
  }
  if (newStatus === 'completed' && !assignment.completed_at) {
    completedAtUpdate = new Date().toISOString();
  }

  dbRun(`
    UPDATE driver_assignments SET
      status = ?,
      accepted_at = ?,
      completed_at = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [newStatus, acceptedAtUpdate, completedAtUpdate, id]);

  return getAssignmentById(id);
}

module.exports = {
  getAssignmentById,
  getAllAssignments,
  getActiveAssignmentForDriver,
  createAssignment,
  updateAssignmentStatus,
};
