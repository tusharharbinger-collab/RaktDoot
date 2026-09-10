'use strict';
const worklogsService = require('./worklogs.service');

function getAllWorkLogs(req, res, next) {
  try {
    const { driver_id, destination_id, urgency, search, limit } = req.query;

    // Drivers can only see their own logs unless manager/admin
    let targetDriverId = driver_id;
    if (req.user.role === 'driver') {
      targetDriverId = req.user.id;
    }

    const logs = worklogsService.getAllWorkLogs({
      driver_id: targetDriverId,
      destination_id,
      urgency,
      search,
      limit,
    });
    const stats = worklogsService.getWorkLogStats();

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      stats,
    });
  } catch (err) {
    next(err);
  }
}

function getWorkLogById(req, res, next) {
  try {
    const log = worklogsService.getWorkLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Work log entry not found' });
    }
    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

function getStats(req, res, next) {
  try {
    const stats = worklogsService.getWorkLogStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllWorkLogs,
  getWorkLogById,
  getStats,
};
