'use strict';
const issuesService = require('./issues.service');
const { getIO } = require('../../sockets/socket.handler');

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

function getAllIssues(req, res, next) {
  try {
    const { status, limit } = req.query;
    const issues = issuesService.getAllIssues({ status, limit: parseInt(limit) || 50 });
    res.json({ success: true, data: issues, count: issues.length });
  } catch (err) {
    next(err);
  }
}

function getIssueById(req, res, next) {
  try {
    const issue = issuesService.getIssueById(req.params.id);
    res.json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
}

function createIssue(req, res, next) {
  try {
    const { description, lat, lng, type, severity, address, image_base64 } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: 'description is required.' });
    }
    const driver_id = req.user.id;
    let image_path = req.file ? `/uploads/${req.file.filename}` : null;

    // Handle direct base64 image payload from web/mobile camera capture
    if (!image_path && image_base64 && typeof image_base64 === 'string') {
      try {
        const matches = image_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1].includes('png') ? '.png' : matches[1].includes('webp') ? '.webp' : '.jpg';
          const filename = `issue_${uuidv4()}${ext}`;
          const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(matches[2], 'base64'));
          image_path = `/uploads/${filename}`;
        }
      } catch (uploadErr) {
        console.warn('[Issue Upload] Base64 decoding failed:', uploadErr.message);
      }
    }

    const issue = issuesService.createIssue({
      driver_id,
      description,
      image_path,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      type: type || 'vehicle_breakdown',
      severity: severity || 'medium',
      address: address || null,
    });

    // 1. Update driver location status to 'issue' in database
    try {
      const { dbRun } = require('../../db/database');
      dbRun(
        "UPDATE driver_locations SET status = 'issue', updated_at = datetime('now') WHERE driver_id = ?",
        [driver_id]
      );
    } catch (_) {}

    // 2. Broadcast driver status change to fleet
    try {
      const io = getIO();
      io.emit('driver_status_changed', {
        driver_id,
        driver_name: issue.driver_name || req.user.name,
        status: 'issue',
        timestamp: new Date().toISOString(),
      });
      io.to('fleet-monitors').emit('driver_status_changed', {
        driver_id,
        driver_name: issue.driver_name || req.user.name,
        status: 'issue',
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    // 3. Create persistent system notification for manager
    try {
      const notificationsService = require('../notifications/notifications.service');
      let destId = 'dest-home-001';
      let managerId = 'user-mgr-001';
      try {
        const { getActiveAssignmentForDriver } = require('../assignments/assignments.service');
        const active = getActiveAssignmentForDriver(driver_id);
        if (active) {
          if (active.destination_id) destId = active.destination_id;
          if (active.assigned_by) managerId = active.assigned_by;
        }
      } catch (_) {}

      const notif = notificationsService.createGeofenceNotification({
        manager_id: managerId,
        driver_id,
        destination_id: destId,
        assignment_id: null,
        type: 'issue_reported',
        message: `🚨 INCIDENT REPORTED: Driver ${issue.driver_name || req.user.name} reported ${(issue.type || 'Breakdown').replace(/_/g, ' ').toUpperCase()} (${(issue.severity || 'medium').toUpperCase()}): ${issue.description || 'Driver reported an urgent issue'}`,
        distance_m: 0,
      });

      const io = getIO();
      io.emit('notification_new', { notification: notif });
      io.to('fleet-monitors').emit('notification_new', { notification: notif });
    } catch (notifErr) {
      console.warn('[Issue Notification] Error:', notifErr.message);
    }

    // 4. Broadcast real-time issue_alert to all connected monitors
    try {
      const io = getIO();
      const payload = { issue, ...issue };
      io.emit('issue_alert', payload);
      io.to('fleet-monitors').emit('issue_alert', payload);
    } catch (_) { /* Socket may not be ready in tests */ }

    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
}

function updateIssueStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required.' });
    }
    const issue = issuesService.updateIssueStatus(req.params.id, status, req.user.id);

    // Broadcast resolution
    try {
      const io = getIO();
      io.emit('issue_updated', { issue });
      io.to('fleet-monitors').emit('issue_updated', { issue });
    } catch (_) { /* ok */ }

    res.json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
}

function deleteIssue(req, res, next) {
  try {
    const result = issuesService.deleteIssue(req.params.id);

    try {
      const io = getIO();
      io.emit('issue_deleted', { id: req.params.id });
      io.to('fleet-monitors').emit('issue_deleted', { id: req.params.id });
    } catch (_) { /* ok */ }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
}

function clearIssues(req, res, next) {
  try {
    const { status } = req.query;
    issuesService.clearIssues({ status });

    try {
      const io = getIO();
      io.emit('issues_cleared', { status });
      io.to('fleet-monitors').emit('issues_cleared', { status });
    } catch (_) { /* ok */ }

    res.json({ success: true, status: status || 'all' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssueStatus,
  deleteIssue,
  clearIssues,
};
