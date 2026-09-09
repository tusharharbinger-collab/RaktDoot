import { useState } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, X, Image as ImageIcon,
  ExternalLink, MapPin, Phone, Navigation, Camera, ShieldAlert, Check
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import api, { API_URL } from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';

const ISSUE_CATEGORY_MAP = {
  vehicle_breakdown: { label: 'Vehicle Breakdown', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' },
  flat_tire: { label: 'Flat Tire / Puncture', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  accident: { label: 'Accident / Collision', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.2)', border: 'rgba(220, 38, 38, 0.5)' },
  traffic_delay: { label: 'Severe Traffic Jam', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.35)' },
  cargo_damage: { label: 'Cargo / Blood Unit Damaged', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' },
  fuel_empty: { label: 'Fuel / Battery Depleted', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)' },
};

const SEVERITY_MAP = {
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' },
  high: { label: 'HIGH', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316' },
  medium: { label: 'MEDIUM', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' },
  low: { label: 'LOW', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6' },
};

function IssueDetailModal({ issue, onClose, onResolve }) {
  if (!issue) return null;

  const category = ISSUE_CATEGORY_MAP[issue.type] || {
    label: issue.type ? issue.type.replace(/_/g, ' ') : 'General Incident',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)'
  };
  const severity = SEVERITY_MAP[issue.severity?.toLowerCase()] || SEVERITY_MAP.high;
  const mapsUrl = issue.lat && issue.lng ? `https://www.google.com/maps?q=${issue.lat},${issue.lng}` : null;
  const fullImageUrl = issue.image_path ? `${API_URL}${issue.image_path}` : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: severity.color }} />
            <span className="modal-title" style={{ fontSize: 16, fontWeight: 700 }}>
              Incident Details · #{issue.id}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--space-5)' }}>
          {/* Top Badges Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              color: category.color, backgroundColor: category.bg, border: `1px solid ${category.border}`
            }}>
              {category.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
              color: severity.color, backgroundColor: severity.bg, border: `1px solid ${severity.border}`,
              letterSpacing: 0.5
            }}>
              SEVERITY: {severity.label}
            </span>
            <span className={`badge badge-${issue.status}`} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700 }}>
              {issue.status}
            </span>
          </div>

          {/* Incident Photo Attachment */}
          {fullImageUrl ? (
            <div style={{ marginBottom: 'var(--space-4)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-default)', background: '#0a0c14' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={14} /> Captured Incident Photo
                </span>
                <a
                  href={fullImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ExternalLink size={12} /> Open Full Resolution
                </a>
              </div>
              <img
                src={fullImageUrl}
                alt="Incident Photo"
                style={{ width: '100%', maxHeight: 380, objectFit: 'contain', background: '#05060a' }}
                onError={e => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div style={{
              marginBottom: 'var(--space-4)', padding: '14px', borderRadius: 10,
              background: 'var(--bg-overlay)', border: '1px dashed var(--border-subtle)',
              display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 12
            }}>
              <Camera size={16} />
              <span>No photo evidence attached with this incident report.</span>
            </div>
          )}

          {/* Description Box */}
          <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 'var(--space-4)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Incident Description & Instructions
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
              {issue.description || 'No description provided.'}
            </p>
          </div>

          {/* 2-Column Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {/* Driver Contact */}
            <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 'var(--space-3)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Assigned Driver</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{issue.driver_name || 'Driver'}</div>
              {issue.driver_phone ? (
                <a
                  href={`tel:${issue.driver_phone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
                >
                  <Phone size={12} /> Call: {issue.driver_phone}
                </a>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phone unavailable</span>
              )}
            </div>

            {/* Reported Timestamp */}
            <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 'var(--space-3)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Reported At</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {issue.created_at ? format(new Date(issue.created_at), 'hh:mm a · dd MMM yyyy') : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {issue.created_at ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true }) : ''}
              </div>
            </div>
          </div>

          {/* Physical Location Card */}
          <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: 'var(--space-4)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} style={{ color: '#34d399' }} /> Physical Location & Coordinates
              </span>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                >
                  <Navigation size={12} /> Navigate on Maps
                </a>
              )}
            </div>
            {issue.address ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {issue.address}
              </div>
            ) : null}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              GPS: {issue.lat ? issue.lat.toFixed(5) : '—'}° N, {issue.lng ? issue.lng.toFixed(5) : '—'}° E
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            {issue.driver_phone && (
              <a
                href={`tel:${issue.driver_phone}`}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Phone size={13} /> Call Driver
              </a>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Navigation size={13} /> View Maps
              </a>
            )}
            {issue.status === 'open' && onResolve && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => onResolve(issue.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={13} /> Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, onResolve, onInspect }) {
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(issue.id);
    } finally {
      setResolving(false);
    }
  };

  const initials = issue.driver_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';
  const category = ISSUE_CATEGORY_MAP[issue.type] || {
    label: issue.type ? issue.type.replace(/_/g, ' ') : 'General Incident',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)'
  };
  const severity = SEVERITY_MAP[issue.severity?.toLowerCase()] || SEVERITY_MAP.high;
  const mapsUrl = issue.lat && issue.lng ? `https://www.google.com/maps?q=${issue.lat},${issue.lng}` : null;

  return (
    <div className={`issue-card ${issue.status === 'open' ? 'is-new' : ''}`} id={`issue-${issue.id}`} style={{ padding: 'var(--space-4)' }}>
      {/* Category & Severity Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
            color: category.color, backgroundColor: category.bg, border: `1px solid ${category.border}`
          }}>
            {category.label}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 12,
            color: severity.color, backgroundColor: severity.bg, border: `1px solid ${severity.border}`,
            letterSpacing: 0.4
          }}>
            {severity.label}
          </span>
        </div>
        <span className={`badge badge-${issue.status}`} style={{ fontSize: 10 }}>{issue.status}</span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        {/* Photo thumbnail */}
        {issue.image_path ? (
          <div
            style={{ position: 'relative', width: 68, height: 68, flexShrink: 0, cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)' }}
            onClick={() => onInspect(issue)}
            title="Click to view full photo"
          >
            <img
              src={`${API_URL}${issue.image_path}`}
              alt="Incident thumbnail"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '2px 0', textAlign: 'center' }}>
              <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 700 }}>PHOTO</span>
            </div>
          </div>
        ) : (
          <div
            className="issue-img"
            style={{ width: 68, height: 68, flexShrink: 0, background: 'var(--bg-overlay)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 8, border: '1px dashed var(--border-subtle)', gap: 4 }}
            onClick={() => onInspect(issue)}
          >
            <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>No Photo</span>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Driver name & contact */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="user-avatar" style={{ background: issue.avatar_color || '#b91c1c', width: 22, height: 22, fontSize: 10, borderRadius: 6 }}>{initials}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{issue.driver_name || 'Driver'}</span>
            </div>
            {issue.driver_phone && (
              <a href={`tel:${issue.driver_phone}`} style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                <Phone size={10} /> {issue.driver_phone}
              </a>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>
            {issue.description}
          </p>

          {/* Physical Address / GPS Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            <MapPin size={11} style={{ color: '#34d399', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={issue.address || `${issue.lat}, ${issue.lng}`}>
              {issue.address || (issue.lat ? `${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}` : 'Location unavailable')}
            </span>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#38bdf8', fontSize: 10, textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}
              >
                Maps ↗
              </a>
            )}
          </div>

          {/* Timestamp Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
            <Clock size={10} />
            <span>{issue.created_at ? formatDistanceToNow(new Date(issue.created_at), { addSuffix: true }) : 'Recently'}</span>
            {issue.created_at && <span>({format(new Date(issue.created_at), 'hh:mm a')})</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)', justifyContent: 'flex-end' }}>
        <button
          id={`btn-inspect-${issue.id}`}
          className="btn btn-secondary btn-sm"
          onClick={() => onInspect(issue)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <ExternalLink size={12} />
          Full Report & Info
        </button>
        {issue.status === 'open' && (
          <button
            id={`btn-resolve-${issue.id}`}
            className="btn btn-success btn-sm"
            onClick={handleResolve}
            disabled={resolving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <CheckCircle size={12} />
            {resolving ? 'Resolving...' : 'Mark Resolved'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function IssueFeed() {
  const { issues, setIssues } = useSocket();
  const [inspecting, setInspecting] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = issues.filter(i => filter === 'all' || i.status === filter);
  const openCount = issues.filter(i => i.status === 'open').length;

  const handleResolve = async (id) => {
    await api.patch(`/issues/${id}/status`, { status: 'resolved' });
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved' } : i));
    if (inspecting && inspecting.id === id) {
      setInspecting(prev => ({ ...prev, status: 'resolved' }));
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Incident & Breakdown Feed</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{openCount} open alert{openCount !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
          {['all', 'open', 'resolved'].map(f => (
            <button key={f} id={`issue-filter-${f}`} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>No {filter !== 'all' ? filter : ''} issues</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>All clear — fleet is operating smoothly.</div>
          </div>
        ) : (
          filtered.map(issue => (
            <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} onInspect={setInspecting} />
          ))
        )}
      </div>

      {inspecting && (
        <IssueDetailModal
          issue={inspecting}
          onClose={() => setInspecting(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}

