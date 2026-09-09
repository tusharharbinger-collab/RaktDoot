import { useState, useMemo } from 'react';
import { Shield, ChevronDown, ChevronUp, MapPin, Radio, Compass, Users } from 'lucide-react';

/**
 * Exact Haversine geographical distance in KM.
 */
export function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export default function GeofenceControlPanel({
  geofenceCenter,
  onChangeCenter,
  radiusKm,
  onChangeRadius,
  destinations = [],
  drivers = [],
  selectedDriverId,
  onSelectDriver,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // all, inside, outside

  const PRESET_RADII = [3, 5, 10, 15, 20, 30];

  // Calculate distance from configured center for each driver
  const driversWithDistance = useMemo(() => {
    return drivers
      .filter(d => d.lat && d.lng && (d.lat !== 0 || d.lng !== 0))
      .map(d => {
        const distKm = getHaversineDistanceKm(
          geofenceCenter.lat,
          geofenceCenter.lng,
          d.lat,
          d.lng
        );
        const isInside = distKm != null && distKm <= radiusKm;
        return {
          ...d,
          distanceKm: distKm,
          isInside,
        };
      })
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [drivers, geofenceCenter, radiusKm]);

  const insideDrivers = useMemo(() => driversWithDistance.filter(d => d.isInside), [driversWithDistance]);
  const outsideDrivers = useMemo(() => driversWithDistance.filter(d => !d.isInside), [driversWithDistance]);

  const displayedDrivers = useMemo(() => {
    if (filterMode === 'inside') return insideDrivers;
    if (filterMode === 'outside') return outsideDrivers;
    return driversWithDistance;
  }, [filterMode, insideDrivers, outsideDrivers, driversWithDistance]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 14,
        zIndex: 1000,
        width: 330,
        maxWidth: 'calc(100vw - 28px)',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 14,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}
          >
            <Shield size={15} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
              Manager Geofence Control
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
              Radius: <strong style={{ color: '#38bdf8' }}>{radiusKm} KM</strong> · {insideDrivers.length} Inside
            </div>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Toggle Geofence Control"
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Expandable Body */}
      {!isCollapsed && (
        <div style={{ padding: 14, maxHeight: 420, overflowY: 'auto' }}>
          {/* 1. Center Location Selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              📍 Geofence Center Point
            </label>
            <select
              value={geofenceCenter.id || 'default-home'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'default-home') {
                  onChangeCenter({
                    id: 'default-home',
                    name: 'Jankalyan Blood Centre (Swargate HQ)',
                    address: 'Swargate, Pune',
                    lat: 18.5039,
                    lng: 73.8524,
                  });
                } else {
                  const target = destinations.find(d => d.id === val);
                  if (target) {
                    onChangeCenter({
                      id: target.id,
                      name: target.name,
                      address: target.address,
                      lat: parseFloat(target.lat),
                      lng: parseFloat(target.lng),
                    });
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                background: '#0b1120',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: 12,
                outline: 'none',
              }}
            >
              <option value="default-home">
                🏥 Jankalyan Blood Centre HQ (Swargate, Pune)
              </option>
              {destinations
                .filter(d => !d.is_home && d.id !== 'dest-home-001')
                .map(d => (
                  <option key={d.id} value={d.id}>
                    📍 {d.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 2. Radius Slider & Stepper */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Geofence Radius
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}>
                {radiusKm} KM
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={radiusKm}
              onChange={(e) => onChangeRadius(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: '#38bdf8',
                height: 5,
              }}
            />

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {PRESET_RADII.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeRadius(val)}
                  style={{
                    flex: 1,
                    minWidth: 40,
                    padding: '3px 0',
                    borderRadius: 6,
                    border: radiusKm === val ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: radiusKm === val ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: radiusKm === val ? '#38bdf8' : '#94a3b8',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {val}k
                </button>
              ))}
            </div>
          </div>

          {/* 3. Breakdown Counts (Inside vs Outside Radius) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div
              onClick={() => setFilterMode(prev => prev === 'inside' ? 'all' : 'inside')}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: filterMode === 'inside' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: filterMode === 'inside' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>INSIDE RADIUS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                {insideDrivers.length} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>/ {driversWithDistance.length}</span>
              </div>
            </div>

            <div
              onClick={() => setFilterMode(prev => prev === 'outside' ? 'all' : 'outside')}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: filterMode === 'outside' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                border: filterMode === 'outside' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>OUTSIDE RADIUS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', marginTop: 2 }}>
                {outsideDrivers.length} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>/ {driversWithDistance.length}</span>
              </div>
            </div>
          </div>

          {/* 4. Active Fleet Proximity List */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Fleet Haversine Proximity</span>
              {filterMode !== 'all' && (
                <span
                  onClick={() => setFilterMode('all')}
                  style={{ color: '#38bdf8', cursor: 'pointer', textTransform: 'none', fontWeight: 600 }}
                >
                  Clear filter
                </span>
              )}
            </div>

            {displayedDrivers.length === 0 ? (
              <div style={{ fontSize: 11.5, color: '#64748b', textAlign: 'center', padding: 12 }}>
                No drivers in this category
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {displayedDrivers.map(d => {
                  const isSelected = selectedDriverId === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => onSelectDriver?.(d.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid #dc2626' : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: d.avatar_color || '#06b6d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {d.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                            {d.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {Math.round(d.speed || 0)} km/h · <span style={{ textTransform: 'capitalize' }}>{d.status}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 8,
                            background: d.isInside ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: d.isInside ? '#34d399' : '#94a3b8',
                            border: d.isInside ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {d.distanceKm != null ? `${d.distanceKm} km` : '—'} {d.isInside ? '· IN' : '· OUT'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
