import { useEffect, useState } from 'react';
import { X, MapPin, Phone, Clock, Navigation, Gauge, AlertTriangle, Activity, Truck } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { formatDistanceToNow, format } from 'date-fns';
import { getDisplayAddress } from '../../utils/geoAddress';

const STATUS_COLORS = { active: 'var(--status-active)', idle: 'var(--status-idle)', issue: 'var(--status-issue)', offline: 'var(--status-offline)' };

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function DriverDetailsDrawer({ driverId, onClose }) {
  const { fleetDrivers } = useSocket();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const driver = fleetDrivers[driverId];

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    api.get(`/drivers/${driverId}`)
      .then(r => setDetail(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [driverId]);

  if (!driverId) return null;
  const d = driver || detail;
  if (!d) return null;

  const initials = d.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <aside
      className="driver-details-panel"
      style={{
        width: 360,
        maxWidth: '100%',
        flexShrink: 0,
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-elevated)' }}>
        <div className="user-avatar" style={{ background: d.avatar_color || '#b91c1c', width: 44, height: 44, fontSize: 15, borderRadius: 10, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span className={`badge badge-${d.status || 'offline'}`} style={{ textTransform: 'uppercase', fontSize: 10, padding: '2px 7px' }}>
              <span className="badge-dot pulse" />
              {d.status || 'offline'}
            </span>
            {(d.vehicle_number || detail?.vehicle_number) && (
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: (d.vehicle_type || detail?.vehicle_type) === 'four_wheeler' ? '#38bdf8' : '#34d399',
                background: (d.vehicle_type || detail?.vehicle_type) === 'four_wheeler' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                border: `1px solid ${(d.vehicle_type || detail?.vehicle_type) === 'four_wheeler' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(52, 211, 153, 0.35)'}`,
                padding: '2px 7px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}>
                {(d.vehicle_type || detail?.vehicle_type) === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'} · {d.vehicle_number || detail?.vehicle_number}
              </span>
            )}
          </div>
        </div>
        <button
          id="btn-close-drawer"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onClose}
          title="Close details"
          style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: 6 }}
        >
          <X size={15} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}>
          <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        </div>
      ) : (
        <>
          {/* Telemetry metrics */}
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-3)' }}>Vehicle Telemetry</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Speed', value: `${Math.round(d.speed || 0)} km/h`, color: 'var(--color-accent)', icon: '⚡' },
                  { label: 'Heading', value: `${Math.round(d.heading || 0)}°`, color: 'var(--color-primary-light)', icon: '🧭' },
                  { label: 'Latitude', value: d.lat?.toFixed(5) || '—', color: 'var(--text-secondary)', icon: '📍', mono: true },
                  { label: 'Longitude', value: d.lng?.toFixed(5) || '—', color: 'var(--text-secondary)', icon: '📍', mono: true },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 'var(--space-3)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color, fontFamily: item.mono ? 'var(--font-mono)' : undefined }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver info */}
            <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-2)' }}>Driver Info</div>
              <InfoRow icon={MapPin} label="Location" value={getDisplayAddress(d)} />
              <InfoRow
                icon={Truck}
                label="Vehicle"
                value={
                  (d.vehicle_number || detail?.vehicle_number) ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{(d.vehicle_type || detail?.vehicle_type) === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}</span>
                      <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {d.vehicle_number || detail?.vehicle_number}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Not configured</span>
                  )
                }
              />
              {d.phone && <InfoRow icon={Phone} label="Phone" value={d.phone} />}
              <InfoRow icon={Clock} label="Last Seen" value={d.updated_at ? formatDistanceToNow(new Date(d.updated_at), { addSuffix: true }) : 'Unknown'} />
              {detail?.created_at && <InfoRow icon={Activity} label="Joined" value={format(new Date(detail.created_at), 'dd MMM yyyy')} />}
            </div>

            {/* Recent issues */}
            {detail?.issues?.length > 0 && (
              <div style={{ padding: 'var(--space-5)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-3)' }}>Recent Issues ({detail.issues.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {detail.issues.slice(0, 5).map(issue => (
                    <div key={issue.id} style={{ background: 'var(--bg-overlay)', borderRadius: 8, padding: 'var(--space-3)', border: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                      <AlertTriangle size={12} style={{ color: issue.status === 'open' ? 'var(--color-danger)' : 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          {issue.type && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', textTransform: 'capitalize' }}>
                              {issue.type.replace(/_/g, ' ')}
                            </span>
                          )}
                          {issue.severity && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', textTransform: 'uppercase' }}>
                              {issue.severity}
                            </span>
                          )}
                          {issue.image_path && (
                            <span style={{ fontSize: 9, fontWeight: 600, color: '#38bdf8' }}>
                              📷 Photo
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{issue.description}</div>
                        {issue.address && (
                          <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }} numberOfLines={1}>
                            📍 {issue.address}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })} · <span style={{ color: issue.status === 'open' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>{issue.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </aside>
  );
}
