import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, AlertCircle, Sparkles, RefreshCw, Droplet } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/ToastContainer';

export default function BloodCategoryManagerModal({
  isOpen,
  onClose,
  onCategoriesChanged = () => {},
}) {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editCat, setEditCat] = useState(null); // category being edited or null
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active: 1 });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      // Try /api/blood-categories/all first (admin endpoint), fallback to /api/blood-categories
      let res;
      try {
        res = await api.get('/blood-categories/all');
      } catch (_) {
        res = await api.get('/blood-categories');
      }
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load blood categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsCreating(false);
      setEditCat(null);
      fetchCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditCat(null);
    setFormData({ name: '', code: '', description: '', is_active: 1 });
    setIsCreating(true);
  };

  const handleStartEdit = (cat) => {
    setIsCreating(false);
    setEditCat(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
      is_active: cat.is_active ? 1 : 0,
    });
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditCat(null);
    setFormData({ name: '', code: '', description: '', is_active: 1 });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a category name.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (isCreating) {
        const res = await api.post('/blood-categories', {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
        });
        if (res.data?.success) {
          addToast({
            type: 'entry',
            title: 'Category Created',
            message: `Added blood category: ${res.data.data.name}`,
          });
        }
      } else if (editCat) {
        const res = await api.put(`/blood-categories/${editCat.id}`, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        });
        if (res.data?.success) {
          addToast({
            type: 'entry',
            title: 'Category Updated',
            message: `Updated blood category: ${res.data.data.name}`,
          });
        }
      }

      handleCancelForm();
      await fetchCategories();
      onCategoriesChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save blood category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/blood-categories/${cat.id}`);
      addToast({
        type: 'exit',
        title: 'Category Deleted',
        message: `Removed blood category: ${cat.name}`,
      });
      await fetchCategories();
      onCategoriesChanged();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(5, 10, 20, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          background: '#0f172a',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(239, 68, 68, 0.12)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
              }}
            >
              <Droplet size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                Blood Component Categories
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                Admin management for Plasma, Red Blood Cells, Cryo, Platelets & custom units
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: 14,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
              Active Blood Categories ({categories.length})
            </div>
            {!isCreating && !editCat && (
              <button
                onClick={handleStartCreate}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '6px 14px',
                  background: '#dc2626',
                }}
              >
                <Plus size={14} />
                <span>Add New Category</span>
              </button>
            )}
          </div>

          {/* Create or Edit Form */}
          {(isCreating || editCat) && (
            <form
              onSubmit={handleSave}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: 16,
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>
                {isCreating ? '+ Add New Blood Category' : `✏️ Edit Category: ${editCat?.name}`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plasma, Whole Blood"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#0b1120',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Code Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. plasma, rbc, cryo"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#0b1120',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                  Description / Specification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh Frozen Plasma (FFP), maintain at -18°C"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#0b1120',
                    border: '1px solid #334155',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              {editCat && (
                <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>Status:</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value, 10) })}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: '#0b1120',
                      border: '1px solid #334155',
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive / Archived</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 16px', fontSize: 12, background: '#10b981', border: 'none' }}
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          )}

          {/* Categories List Table */}
          <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Category Name</th>
                  <th style={{ padding: '10px 14px' }}>Code</th>
                  <th style={{ padding: '10px 14px' }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: '#64748b' }}>
                      {loading ? 'Loading categories...' : 'No blood categories found.'}
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr
                      key={cat.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: cat.code === 'plasma' ? '#fbbf24'
                              : cat.code === 'red_blood_cell' ? '#ef4444'
                              : cat.code === 'cryo' ? '#38bdf8'
                              : '#a855f7',
                          }} />
                          <span>{cat.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {cat.code}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                        {cat.description || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: cat.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: cat.is_active ? '#34d399' : '#94a3b8',
                          }}
                        >
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleStartEdit(cat)}
                            title="Edit Category"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#38bdf8',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            title="Delete Category"
                            style={{
                              padding: '5px 8px',
                              borderRadius: 6,
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 18px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
