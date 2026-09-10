'use strict';
const { v4: uuidv4 } = require('uuid');
const { dbAll, dbGet, dbRun } = require('../../db/database');

/**
 * Get blood categories
 * @param {boolean} onlyActive - if true, returns only is_active = 1
 */
function getAllCategories({ onlyActive = true } = {}) {
  let sql = `
    SELECT id, code, name, description, is_active, display_order, created_at, updated_at
    FROM blood_categories
  `;
  if (onlyActive) {
    sql += ' WHERE is_active = 1';
  }
  sql += ' ORDER BY display_order ASC, name ASC';
  return dbAll(sql);
}

/**
 * Get category by ID
 */
function getCategoryById(id) {
  return dbGet('SELECT * FROM blood_categories WHERE id = ?', [id]);
}

/**
 * Create a new blood category (Admin only)
 */
function createCategory({ name, code, description, display_order = 0 }) {
  if (!name || !name.trim()) {
    const err = new Error('Category name is required.');
    err.status = 400;
    throw err;
  }

  // Generate code if not provided
  let normalizedCode = (code || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!normalizedCode) normalizedCode = 'cat_' + Date.now();

  // Check uniqueness
  const existing = dbGet('SELECT id FROM blood_categories WHERE code = ?', [normalizedCode]);
  if (existing) {
    const err = new Error(`Category with code "${normalizedCode}" already exists.`);
    err.status = 409;
    throw err;
  }

  const id = 'bcat-' + uuidv4().slice(0, 8);
  dbRun(`
    INSERT INTO blood_categories (id, code, name, description, display_order, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `, [id, normalizedCode, name.trim(), description ? description.trim() : null, parseInt(display_order, 10) || 0]);

  return getCategoryById(id);
}

/**
 * Update an existing blood category (Admin only)
 */
function updateCategory(id, { name, code, description, display_order, is_active }) {
  const existing = getCategoryById(id);
  if (!existing) {
    const err = new Error('Blood category not found.');
    err.status = 404;
    throw err;
  }

  const newName = name !== undefined ? name.trim() : existing.name;
  let newCode = code !== undefined ? code.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_') : existing.code;
  const newDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;
  const newOrder = display_order !== undefined ? parseInt(display_order, 10) : existing.display_order;
  const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  if (newCode !== existing.code) {
    const duplicate = dbGet('SELECT id FROM blood_categories WHERE code = ? AND id != ?', [newCode, id]);
    if (duplicate) {
      const err = new Error(`Category code "${newCode}" is already in use.`);
      err.status = 409;
      throw err;
    }
  }

  dbRun(`
    UPDATE blood_categories
    SET name = ?, code = ?, description = ?, display_order = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [newName, newCode, newDesc, newOrder, newActive, id]);

  return getCategoryById(id);
}

/**
 * Delete a blood category (Admin only)
 */
function deleteCategory(id) {
  const existing = getCategoryById(id);
  if (!existing) {
    const err = new Error('Blood category not found.');
    err.status = 404;
    throw err;
  }

  dbRun('DELETE FROM blood_categories WHERE id = ?', [id]);
  return { success: true, deletedId: id };
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
