import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, Search, UserCheck, Edit3, Trash2,
  ExternalLink, Shield, Navigation, AlertCircle, CheckCircle2,
  Clock, Truck, Send
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import DestinationModal from '../components/manager/DestinationModal';
import CreateCollectionRequestModal from '../components/manager/CreateCollectionRequestModal';
import LanguageToggle from '../components/common/LanguageToggle';
import harbingerLogo from '../assets/harbinger_logo_actual.png';
import api from '../services/api';

export default function ManagerDestinationsPage() {
  const { destinations, reloadDestinations } = useSocket();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, assigned, unassigned

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [requestingDestination, setRequestingDestination] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Metrics
  const totalDestinations = destinations.length;
  const assignedCount = destinations.filter(d => d.assigned_driver_id).length;
  const inProgressCount = destinations.filter(d => d.assignment_status === 'in_progress' || d.assignment_status === 'accepted').length;

  const filteredDestinations = useMemo(() => {
    return destinations.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.address && d.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.assigned_driver_name && d.assigned_driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'assigned') return Boolean(d.assigned_driver_id);
      if (filterType === 'unassigned') return !d.assigned_driver_id;
      return true;
    });
  }, [destinations, searchQuery, filterType]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete destination "${name}"?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/destinations/${id}`);
      await reloadDestinations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete destination');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    switch (status) {
      case 'pending':
        return <span className="badge badge-idle" style={{ fontSize: 10 }}>⏳ Pending</span>;
      case 'accepted':
        return <span className="badge badge-active" style={{ fontSize: 10 }}>👍 Accepted</span>;
      case 'in_progress':
        return <span className="badge badge-active pulse" style={{ fontSize: 10 }}>🚚 En Route</span>;
      case 'completed':
        return <span className="badge badge-active" style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>✅ Completed</span>;
      default:
        return <span className="badge badge-offline" style={{ fontSize: 10 }}>{status}</span>;
    }
  };

  return (
    <div className="page-content-full">
      {/* Topbar */}
      <div className="topbar" style={{ padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <MapPin size={13} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
              {t.destinationManagement || 'Destination Management'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            id="btn-dest-new-request"
            className="btn btn-primary btn-sm"
            onClick={() => setRequestingDestination({})}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <Send size={12} />
            <span>New Request</span>
          </button>

          <button
            id="btn-add-destination"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              fontSize: 11.5,
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} />
            <span>{t.addDestination || 'Add Destination'}</span>
          </button>

          <div style={{ height: 16, width: 1, background: 'var(--border-default)', margin: '0 2px' }} />

          <LanguageToggle />

          <div style={{ height: 16, width: 1, background: 'var(--border-default)', margin: '0 2px' }} />

          <img src={harbingerLogo} alt="Harbinger Group" style={{ height: 26, objectFit: 'contain', display: 'block' }} />
        </div>
      </div>

      {/* Main Page Content */}
      <div className="page-content">
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="telemetry-card" style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Configured Hubs</span>
              <MapPin size={16} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>{totalDestinations}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Permanent delivery checkpoints</div>
          </div>

          <div className="telemetry-card" style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Drivers</span>
              <UserCheck size={16} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>{assignedCount}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Active task dispatches</div>
          </div>

          <div className="telemetry-card" style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>En Route (In Transit)</span>
              <Truck size={16} style={{ color: '#38bdf8' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>{inProgressCount}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Live monitored transports</div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search input */}
          <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search by name, address, or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 8,
                background: 'var(--bg-input, #0b1120)',
                border: '1px solid var(--border-default, #1e293b)',
                color: '#f8fafc',
                fontSize: 13,
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'all', label: 'All Destinations' },
              { id: 'assigned', label: 'Assigned' },
              { id: 'unassigned', label: 'Unassigned' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`btn btn-sm ${filterType === f.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Destinations Table / Grid */}
        {filteredDestinations.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 12,
              border: '1px solid var(--border-default)',
            }}
          >
            <MapPin size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              No destinations found
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
              {searchQuery ? 'Try changing your search keywords' : 'Get started by creating your first delivery destination'}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              <span>Add Destination</span>
            </button>
          </div>
        ) : (
          <div
            className="table-container"
            style={{
              background: 'var(--bg-card)',
              borderRadius: 12,
              border: '1px solid var(--border-default)',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, width: '38%', minWidth: 200, whiteSpace: 'nowrap' }}>
                    DESTINATION & ADDRESS
                  </th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, width: '14%', minWidth: 105, whiteSpace: 'nowrap' }}>
                    GEOFENCE RADIUS
                  </th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, width: '22%', minWidth: 150, whiteSpace: 'nowrap' }}>
                    ASSIGNED DRIVER
                  </th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, width: '13%', minWidth: 105, whiteSpace: 'nowrap' }}>
                    DISPATCH STATUS
                  </th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11.5, textAlign: 'right', width: '13%', minWidth: 115, whiteSpace: 'nowrap' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDestinations.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Destination name & coords */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: d.is_home ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                            color: d.is_home ? '#f59e0b' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          <MapPin size={16} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13.5 }}>{d.name}</span>
                            {d.is_home && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                borderRadius: 4,
                                padding: '1px 5px',
                                textTransform: 'uppercase',
                              }}>
                                Base Hub
                              </span>
                            )}
                          </div>
                          <div
                            title={d.address || 'No physical address specified'}
                            style={{
                              fontSize: 12,
                              color: '#94a3b8',
                              marginTop: 2,
                              maxWidth: 320,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {d.address || 'No physical address specified'}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                            {parseFloat(d.lat).toFixed(4)}, {parseFloat(d.lng).toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Radius */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        <Shield size={11} />
                        {d.radius_m >= 1000 ? `${(d.radius_m / 1000).toFixed(1)} km` : `${d.radius_m} m`}
                      </span>
                    </td>

                    {/* Assigned driver */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {d.assigned_driver_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: d.assigned_driver_avatar || '#06b6d4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'white',
                              flexShrink: 0,
                            }}
                          >
                            {d.assigned_driver_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 12.5 }}>
                              {d.assigned_driver_name}
                            </div>
                            {d.driver_location_status && (
                              <span className={`badge badge-${d.driver_location_status}`} style={{ fontSize: 9.5, padding: '0 4px' }}>
                                {d.driver_location_status}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          No driver assigned
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {d.assigned_driver_id ? (
                        getStatusBadge(d.assignment_status)
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748b' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {!d.is_home && (
                          <button
                            onClick={() => setRequestingDestination(d)}
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '4px 10px',
                              fontSize: 11.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                            title="Dispatch a blood collection request to this destination"
                          >
                            <Send size={12} />
                            <span>Request</span>
                          </button>
                        )}

                        <button
                          onClick={() => setEditingDestination(d)}
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit Destination"
                          style={{ padding: '4px', borderRadius: 6 }}
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          disabled={deletingId === d.id}
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: '#ef4444', padding: '4px', borderRadius: 6 }}
                          title="Delete Destination"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modals */}
        <CreateCollectionRequestModal
          isOpen={Boolean(requestingDestination)}
          initialDestination={requestingDestination?.id ? requestingDestination : null}
          onClose={() => setRequestingDestination(null)}
        />

        <DestinationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />

        <DestinationModal
          isOpen={Boolean(editingDestination)}
          destination={editingDestination}
          onClose={() => setEditingDestination(null)}
        />
      </div>
    </div>
  );
}
