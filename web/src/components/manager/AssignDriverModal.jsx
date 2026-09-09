import { useState, useEffect } from 'react';
import { X, UserCheck, MapPin, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export default function AssignDriverModal({ isOpen, onClose, destination, onAssigned }) {
  const { fleetDriversList, reloadDestinations } = useSocket();
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !destination) return;
    setLoading(true);
    setError(null);
    setSelectedDriverId(destination.assigned_driver_id || '');

    api.get('/drivers')
      .then(res => {
        if (res.data?.success) {
          setDrivers(res.data.data || []);
        }
      })
      .catch(err => {
        console.error('Failed to load drivers:', err);
        // Fallback to fleetDriversList from socket
        setDrivers(fleetDriversList);
      })
      .finally(() => setLoading(false));
  }, [isOpen, destination, fleetDriversList]);

  if (!isOpen || !destination) return null;

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const hasExistingAssignment = destination.assigned_driver_id && destination.assigned_driver_id === selectedDriverId;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setError('Please select a driver to assign.');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      await api.post('/assignments', {
        destination_id: destination.id,
        driver_id: selectedDriverId,
      });

      await reloadDestinations();
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          width: '92%',
          maxWidth: '520px',
          background: 'var(--bg-card, #0f172a)',
          borderRadius: 16,
          border: '1px solid var(--border-default, #1e293b)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                Assign Driver to Destination
              </h3>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                Dispatches a real-time delivery task directly to driver app
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color: 'var(--text-muted, #94a3b8)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAssign} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 8,
                color: '#f87171',
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Destination Summary Card */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle, #1e293b)',
              borderRadius: 10,
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <MapPin size={15} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc' }}>
                {destination.name}
              </span>
            </div>
            {destination.address && (
              <div style={{ fontSize: 12, color: '#94a3b8', paddingLeft: 23 }}>
                {destination.address}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: '#64748b', paddingLeft: 23, marginTop: 4 }}>
              Geofence Radius: <strong style={{ color: '#ef4444' }}>{destination.radius_m}m</strong>
            </div>
          </div>

          {/* Driver Selection */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
              Select Delivery Driver *
            </label>

            {loading ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '12px 0' }}>Loading fleet drivers...</div>
            ) : drivers.length === 0 ? (
              <div style={{ fontSize: 12, color: '#f87171', padding: '12px 0' }}>No active drivers found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {drivers.map(d => {
                  const isSelected = selectedDriverId === d.id;
                  const isCurrent = destination.assigned_driver_id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDriverId(d.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid #10b981' : '1px solid var(--border-default, #1e293b)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: d.avatar_color || '#06b6d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {d.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {d.name}
                            {isCurrent && (
                              <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 6 }}>
                                Current
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            {d.phone || d.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge badge-${d.status || 'offline'}`} style={{ fontSize: 10 }}>
                          <span className="badge-dot" />
                          {d.status || 'offline'}
                        </span>
                        {isSelected && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info note */}
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 8,
              fontSize: 11.5,
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 18,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>
              Once assigned, a real-time task prompt will appear on the driver's device to Accept or Reject.
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={assigning}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || !selectedDriverId}
              className="btn btn-primary btn-sm"
              style={{ minWidth: 130, background: '#10b981', borderColor: '#059669' }}
            >
              {assigning ? 'Assigning...' : 'Dispatch Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
