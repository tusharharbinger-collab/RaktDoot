'use strict';
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../../db/database');

function getAllIssues({ status, limit = 50 } = {}) {
  let sql = `
    SELECT
      i.id, i.type, i.severity, i.description, i.image_path, i.lat, i.lng, i.address, i.status,
      i.created_at, i.resolved_at,
      u.id AS driver_id, u.name AS driver_name, u.phone AS driver_phone, u.avatar_color,
      r.name AS resolved_by_name
    FROM issues i
    JOIN users u ON u.id = i.driver_id
    LEFT JOIN users r ON r.id = i.resolved_by
  `;
  const params = [];
  if (status) {
    sql += ' WHERE i.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY i.created_at DESC LIMIT ?';
  params.push(limit);
  return dbAll(sql, params);
}

function getIssueById(issueId) {
  const issue = dbGet(`
    SELECT
      i.*, u.name AS driver_name, u.phone AS driver_phone, u.avatar_color,
      r.name AS resolved_by_name
    FROM issues i
    JOIN users u ON u.id = i.driver_id
    LEFT JOIN users r ON r.id = i.resolved_by
    WHERE i.id = ?
  `, [issueId]);

  if (!issue) {
    const err = new Error('Issue not found.');
    err.status = 404;
    throw err;
  }
  return issue;
}

function createIssue({ driver_id, type, severity, description, image_path, lat, lng, address }) {
  const id = uuidv4();
  dbRun(`
    INSERT INTO issues (id, driver_id, type, severity, description, image_path, lat, lng, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    driver_id,
    type || 'vehicle_breakdown',
    severity || 'medium',
    description,
    image_path || null,
    lat || null,
    lng || null,
    address || null
  ]);

  return getIssueById(id);
}

function updateIssueStatus(issueId, status, resolvedBy) {
  const valid = ['open', 'resolved'];
  if (!valid.includes(status)) {
    const err = new Error(`Invalid status. Must be: ${valid.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const issue = dbGet('SELECT id FROM issues WHERE id = ?', [issueId]);
  if (!issue) {
    const err = new Error('Issue not found.');
    err.status = 404;
    throw err;
  }

  dbRun(`
    UPDATE issues SET
      status = ?,
      resolved_by = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END,
      resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `, [status, status, resolvedBy, status, issueId]);

  return getIssueById(issueId);
}

function deleteIssue(issueId) {
  const issue = dbGet('SELECT id, image_path FROM issues WHERE id = ?', [issueId]);
  if (!issue) {
    const err = new Error('Issue not found.');
    err.status = 404;
    throw err;
  }

  dbRun('DELETE FROM issues WHERE id = ?', [issueId]);
  return { success: true, id: issueId };
}

function clearIssues({ status } = {}) {
  if (status) {
    dbRun('DELETE FROM issues WHERE status = ?', [status]);
  } else {
    dbRun('DELETE FROM issues');
  }
  return { success: true };
}

module.exports = {
  getAllIssues,
  getIssueById,
  createIssue,
  updateIssueStatus,
  deleteIssue,
  clearIssues,
};
