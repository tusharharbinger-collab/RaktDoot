import { useState } from 'react';
import { Search, Navigation, Clock, Zap, AlertTriangle, MapPin, X, ChevronRight } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { getDisplayAddress } from '../../utils/geoAddress';

const STATUS_COLORS = {
  active: 'var(--status-active)',
  idle: 'var(--status-idle)',
  issue: 'var(--status-issue)',
  offline: 'var(--status-offline)',
};

function DriverItem({ driver, selected, onClick }) {
  const initials = driver.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const lastSeen = driver.updated_at ? formatDistanceToNow(new Date(driver.updated_at), { addSuffix: true }) : 'Unknown';

  return (
    <div
      id={`driver-item-${driver.id}`}
      className={`driver-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        padding: '10px 12px',
        margin: '3px 8px',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
      }}
    >
      {/* Compact Avatar with Status Indicator */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className="user-avatar" style={{
          background: driver.avatar_color || '#b91c1c',
          width: 36, height: 36, fontSize: 13, fontWeight: 700,
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        }}>
          {initials}
        </div>
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: STATUS_COLORS[driver.status] || 'var(--status-offline)',
          border: '2px solid #161822',
        }} />
      </div>

      {/* Driver info */}
      <div className="driver-item-info" style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div className="driver-item-name" style={{
            fontSize: 13,
            fontWeight: 600,
            color: selected ? '#ffffff' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {driver.name}
          </div>

          {driver.status === 'issue' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'rgba(239, 68, 68, 0.18)', border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#f87171', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
              flexShrink: 0,
            }}>
              <AlertTriangle size={10} /> Issue
            </span>
          )}
        </div>

        <div className="driver-item-meta" style={{
          marginTop: 2,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            color: STATUS_COLORS[driver.status],
            textTransform: 'capitalize',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            {driver.status || 'offline'}
          </span>

          {driver.vehicle_number && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{
                color: driver.vehicle_type === 'four_wheeler' ? '#38bdf8' : '#34d399',
                fontWeight: 700,
                fontSize: 10.5,
              }}>
                {driver.vehicle_type === 'four_wheeler' ? '🚐' : '🛵'} {driver.vehicle_number}
              </span>
            </>
          )}

          {driver.speed > 0 ? (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>
                {Math.round(driver.speed)} km/h
              </span>
            </>
          ) : (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ opacity: 0.7 }}>{lastSeen}</span>
            </>
          )}
        </div>
        <div className="driver-item-meta" style={{ marginTop: 2, color: '#818cf8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={10} style={{ flexShrink: 0, color: '#818cf8' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {getDisplayAddress(driver)}
          </span>
        </div>
      </div>

      <ChevronRight size={14} style={{
        color: selected ? 'var(--color-primary-light)' : 'var(--text-muted)',
        opacity: selected ? 1 : 0.35,
        flexShrink: 0,
        transition: 'transform 0.18s ease',
        transform: selected ? 'translateX(2px)' : 'none',
      }} />
    </div>
  );
}

export default function DriverList({ selectedId, onSelect, onClose }) {
  const { fleetDriversList } = useSocket();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = fleetDriversList
    .filter(d => {
      if (filter !== 'all' && d.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.phone?.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const order = { issue: 0, active: 1, idle: 2, offline: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

  const counts = {
    all: fleetDriversList.length,
    active: fleetDriversList.filter(d => d.status === 'active').length,
    idle: fleetDriversList.filter(d => d.status === 'idle').length,
    issue: fleetDriversList.filter(d => d.status === 'issue').length,
    offline: fleetDriversList.filter(d => d.status === 'offline').length,
  };

  const filterTabs = [
    { id: 'all', label: t.all, count: counts.all, color: 'var(--text-secondary)' },
    { id: 'active', label: t.active, count: counts.active, color: 'var(--status-active)' },
    { id: 'issue', label: t.issue, count: counts.issue, color: 'var(--status-issue)' },
    { id: 'idle', label: t.idle, count: counts.idle, color: 'var(--status-idle)' },
    { id: 'offline', label: t.offline, count: counts.offline, color: 'var(--status-offline)' },
  ];

  return (
    <div className="map-panel-list" style={{ width: 330 }}>
      {/* Header */}
      <div className="driver-list-header" style={{ padding: '14px 14px 10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            {t.bloodDeliveryVehicles}
            <span style={{
              marginLeft: 6,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 7px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              {counts.all}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#34d399',
            }}>
              <span className="badge-dot pulse" style={{ width: 6, height: 6, background: '#10b981' }} />
              {t.live}
            </span>
          </div>
        </div>

        {/* Master Fleet Search */}
        <div className="driver-search" style={{ marginBottom: 10 }}>
          <Search size={14} className="driver-search-icon" />
          <input
            id="driver-search"
            className="input"
            style={{ paddingLeft: 34, paddingRight: search ? 30 : 12, fontSize: 12.5, height: 36 }}
            placeholder={t.searchDriverPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                padding: 2, display: 'flex', alignItems: 'center',
              }}
              title="Clear"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {filterTabs.map(({ id, label, count, color }) => {
            const isSelected = filter === id;
            return (
              <button
                key={id}
                id={`filter-${id}`}
                onClick={() => setFilter(id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(220, 38, 38, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(185, 28, 28, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {id !== 'all' && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                )}
                <span>{label}</span>
                <span style={{
                  fontSize: 10,
                  opacity: isSelected ? 1 : 0.6,
                  marginLeft: 1,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Driver list items */}
      <div className="driver-list-items" style={{ padding: '6px 0' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Zap size={22} style={{ marginBottom: 6, opacity: 0.3 }} />
            <div style={{ fontSize: 12 }}>No vehicles matching filter</div>
          </div>
        ) : (
          filtered.map(driver => (
            <DriverItem
              key={driver.id}
              driver={driver}
              selected={selectedId === driver.id}
              onClick={() => onSelect?.(selectedId === driver.id ? null : driver.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
