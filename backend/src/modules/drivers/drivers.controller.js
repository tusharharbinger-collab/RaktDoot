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

module.exports = { getAllDrivers, getDriverById, updateStatus, registerPushToken };
