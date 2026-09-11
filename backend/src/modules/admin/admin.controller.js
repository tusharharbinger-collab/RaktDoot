'use strict';
const adminService = require('./admin.service');

function listUsers(req, res, next) {
  try {
    const { role, search, page, limit } = req.query;
    const result = adminService.listUsers({ role, search, page, limit });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

function getTelemetry(req, res, next) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const stats = adminService.getTelemetry();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}

module.exports = { listUsers, createUser, updateUser, deleteUser, getTelemetry };
