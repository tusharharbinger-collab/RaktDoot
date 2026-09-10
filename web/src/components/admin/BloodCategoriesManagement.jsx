import { useState, useEffect } from 'react';
import { Droplet, Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/ToastContainer';

export default function BloodCategoriesManagement() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editCat, setEditCat] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active: 1 });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
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
    fetchCategories();
  }, []);

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
            title: 'Category Added',
            message: `Created blood category: ${res.data.data.name}`,
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save blood category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/blood-categories/${cat.id}`);
      addToast({
        type: 'exit',
        title: 'Category Deleted',
        message: `Removed ${cat.name}`,
      });
      await fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Overview Card */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Droplet size={22} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Blood Component Categories & Unit Specifications
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Configure dispatch categories (Plasma, Red Blood Cells, Cryo, Platelets) and custom units.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchCategories}
              className="btn btn-secondary btn-sm"
              title="Refresh list"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            {!isCreating && !editCat && (
              <button
                onClick={handleStartCreate}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626' }}
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 16,
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Inline Create / Edit Form */}
      {(isCreating || editCat) && (
        <form
          onSubmit={handleSave}
          className="card"
          style={{
            marginBottom: 16,
            background: '#0b1120',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>
            {isCreating ? '+ Add New Blood Component Category' : `✏️ Edit Category: ${editCat?.name}`}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Plasma, Platelets, Cryo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                Code Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. plasma, red_blood_cell, cryo"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              Description / Temperature / Storage Guidelines
            </label>
            <input
              type="text"
              placeholder="e.g. Packed Red Blood Cells (PRBC), store at 2°C to 6°C"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {editCat && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>Status:</label>
              <select
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value, 10) })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: 12,
                }}
              >
                <option value={1}>Active (Available for Dispatch)</option>
                <option value={0}>Inactive / Archived</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancelForm}
              className="btn btn-secondary btn-sm"
              style={{ padding: '7px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm"
              style={{ padding: '7px 20px', background: '#059669', border: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Category Name</th>
              <th style={{ padding: '12px 16px' }}>Code Identifier</th>
              <th style={{ padding: '12px 16px' }}>Description / Storage Note</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Admin Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading categories...' : 'No blood categories found.'}
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr
                  key={cat.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: cat.code === 'plasma' ? '#fbbf24'
                            : cat.code === 'red_blood_cell' ? '#ef4444'
                            : cat.code === 'cryo' ? '#38bdf8'
                            : '#a855f7',
                        }}
                      />
                      <span>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {cat.code}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {cat.description || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
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
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="btn btn-ghost btn-sm"
                        title="Edit category"
                        style={{ padding: '5px 10px', color: '#38bdf8' }}
                      >
                        <Edit2 size={13} />
                        <span style={{ marginLeft: 4 }}>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="btn btn-ghost btn-sm"
                        title="Delete category"
                        style={{ padding: '5px 10px', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                        <span style={{ marginLeft: 4 }}>Delete</span>
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
  );
}
