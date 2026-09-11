import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ROLES = ['driver', 'manager', 'admin'];
const ROLE_COLORS = { admin: 'badge-admin', manager: 'badge-manager', driver: 'badge-driver' };

function UserFormModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'driver',
    vehicle_type: user?.vehicle_type || 'two_wheeler',
    vehicle_number: user?.vehicle_number || '',
    password: '',
    is_active: user?.is_active !== 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const isEditing = !!user;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.email || (!isEditing && !form.password)) {
      setError('Name, email, and password (for new users) are required.');
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        is_active: form.is_active,
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number ? form.vehicle_number.trim().toUpperCase() : null,
      };
      if (form.password) payload.password = form.password;
      if (isEditing) {
        const res = await api.put(`/admin/users/${user.id}`, payload);
        onSave(res.data.data, 'update');
      } else {
        const res = await api.post('/admin/users', { ...payload, password: form.password });
        onSave(res.data.data, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEditing ? 'Edit User' : 'Create User'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px', color: 'var(--color-danger)', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input id="user-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input id="user-email" className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input id="user-phone" className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-XXXXXXXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select id="user-role" className="select" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {form.role === 'driver' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select id="user-vehicle-type" className="select" value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}>
                  <option value="two_wheeler">🛵 Two Wheeler (Bike / Scooter)</option>
                  <option value="four_wheeler">🚐 Four Wheeler (Van / Car)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Reg. Number</label>
                <input
                  id="user-vehicle-number"
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  value={form.vehicle_number}
                  onChange={e => set('vehicle_number', e.target.value.toUpperCase())}
                  placeholder="MH 12 AB 1234"
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{isEditing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="user-password"
                className="input"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={isEditing ? '(unchanged)' : 'Min 6 characters'}
                style={{ paddingRight: 44 }}
              />
              <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          {isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="user-active"
                type="checkbox"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="user-active" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>Account Active</label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button id="btn-cancel-user" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button id="btn-save-user" className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ user, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(user.id);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️</span> Delete User
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={loading}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--color-danger)',
              fontSize: 13,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>? This action cannot be undone and will remove all associated data.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button id="btn-confirm-delete" className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/admin/users/${user.id}/password`, { password });
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1100);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const roleBadgeClass = ROLE_COLORS[user?.role] || 'badge-driver';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b'
            }}>
              <KeyRound size={17} />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: 16, fontWeight: 700 }}>Change Password</span>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin credential management</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={loading}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Target User Info Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="user-avatar" style={{ background: user?.avatar_color || '#b91c1c', width: 34, height: 34, fontSize: 12, borderRadius: 7 }}>
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
              </div>
              <span className={`badge ${roleBadgeClass}`} style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-danger)', fontSize: 12.5
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 12px', color: '#34d399', fontSize: 12.5,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <ShieldCheck size={16} />
                <span>Password changed successfully for <strong>{user?.name}</strong>!</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="change-new-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter min 6 characters"
                  style={{ paddingRight: 44 }}
                  autoFocus
                  disabled={loading || success}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => setShowPass(v => !v)}
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12 }}>Confirm New Password *</label>
              <input
                id="change-confirm-password"
                className="input"
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button
              id="btn-submit-change-password"
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <KeyRound size={13} />
              {loading ? 'Updating...' : success ? 'Updated!' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagementTable() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users);
      setMeta({ total: res.data.total, pages: res.data.pages });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = (savedUser, type) => {
    if (type === 'create') setUsers(prev => [savedUser, ...prev]);
    else setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
  };

  const handleDelete = async (id) => {
    await api.delete(`/admin/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteTarget(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input id="user-search" className="input" style={{ paddingLeft: 36 }} placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select id="role-filter" className="select" style={{ width: 140 }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <button id="btn-create-user" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> Create User
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Vehicle Profile</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const initials = u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
                return (
                  <tr key={u.id} id={`user-row-${u.id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="user-avatar" style={{ background: u.avatar_color || '#b91c1c', width: 34, height: 34, fontSize: 12, borderRadius: 8, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_COLORS[u.role]}`}>{u.role}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.phone || '—'}</td>
                    <td>
                      {u.role === 'driver' ? (
                        u.vehicle_number ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: u.vehicle_type === 'four_wheeler' ? '#38bdf8' : '#34d399',
                              background: u.vehicle_type === 'four_wheeler' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(52, 211, 153, 0.12)',
                              border: `1px solid ${u.vehicle_type === 'four_wheeler' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
                              padding: '2px 8px',
                              borderRadius: 6,
                              width: 'fit-content',
                            }}>
                              {u.vehicle_type === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.5 }}>
                              {u.vehicle_number}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                            ⚠️ Not configured
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-offline'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {u.last_seen ? formatDistanceToNow(new Date(u.last_seen), { addSuffix: true }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          id={`btn-password-${u.id}`}
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setPasswordTarget(u)}
                          title="Change Password"
                          style={{ color: '#f59e0b' }}
                        >
                          <KeyRound size={13} />
                        </button>
                        <button id={`btn-edit-${u.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditTarget(u)} title="Edit Details"><Pencil size={13} /></button>
                        {u.id !== me?.id && (
                          <button id={`btn-delete-${u.id}`} className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteTarget(u)} title="Delete" style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {meta.pages} ({meta.total} users)</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Modals */}
      {(creating || editTarget) && (
        <UserFormModal user={editTarget} onClose={() => { setCreating(false); setEditTarget(null); }} onSave={handleSave} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal user={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      )}
      {passwordTarget && (
        <ChangePasswordModal user={passwordTarget} onClose={() => setPasswordTarget(null)} onSuccess={() => load()} />
      )}
    </div>
  );
}
