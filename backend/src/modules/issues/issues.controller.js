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

    // Broadcast real-time alert to manager/admin clients
    try {
      const io = getIO();
      io.to('fleet-monitors').emit('issue_alert', { issue });
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
