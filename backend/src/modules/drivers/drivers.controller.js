'use strict';
const driversService = require('./drivers.service');

function getAllDrivers(req, res, next) {
  try {
    const drivers = driversService.getAllDriversWithLocations();
    res.json({ success: true, data: drivers, count: drivers.length });
  } catch (err) {
    next(err);
  }
}

function getDriverById(req, res, next) {
  try {
    const driver = driversService.getDriverById(req.params.id);
    res.json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
}

function updateStatus(req, res, next) {
  try {
    const { driver_id, status } = req.body;
    if (!driver_id || !status) {
      return res.status(400).json({ success: false, message: 'driver_id and status are required.' });
    }
    const result = driversService.updateDriverStatus(driver_id, status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

function registerPushToken(req, res, next) {
  try {
    const { push_token } = req.body;
    if (!push_token) {
      return res.status(400).json({ success: false, message: 'push_token is required' });
    }
    const { dbRun } = require('../../db/database');
    dbRun('UPDATE users SET push_token = ? WHERE id = ?', [push_token, req.user.id]);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (err) {
    next(err);
  }
}

function updateProfile(req, res, next) {
  try {
    const targetDriverId = (req.user.role === 'admin' || req.user.role === 'manager') && req.body.driver_id
      ? req.body.driver_id
      : req.user.id;

    const { vehicle_type, vehicle_number, phone, name } = req.body;
    const updated = driversService.updateDriverProfile(targetDriverId, {
      vehicle_type,
      vehicle_number,
      phone,
      name,
    });

    // Broadcast to web monitors via Socket.io
    try {
      const { getIO } = require('../../sockets/socket.handler');
      const io = getIO();
      if (io) {
        io.to('fleet-monitors').emit('driver_profile_updated', {
          driver_id: updated.id,
          driver_name: updated.name,
          phone: updated.phone,
          vehicle_type: updated.vehicle_type,
          vehicle_number: updated.vehicle_number,
          avatar_color: updated.avatar_color,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (sockErr) {
      console.warn('[Driver Controller] Socket broadcast warning:', sockErr.message);
    }

    res.json({ success: true, data: updated, message: 'Driver profile updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDrivers,
  getDriverById,
  updateStatus,
  registerPushToken,
  updateProfile,
};
