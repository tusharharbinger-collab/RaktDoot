import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, Navigation, Shield, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

// Custom destination marker icon for mini map
const destIcon = L.divIcon({
  html: `
    <div style="
      width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg, #ef4444, #b91c1c);
      transform: rotate(-45deg);
      border: 3px solid #ffffff;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.6);
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white; font-weight: 800; font-size: 15px;
      ">📍</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
  className: '',
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function DestinationModal({ isOpen, onClose, destination = null, onSaved }) {
  const { reloadDestinations } = useSocket();
  const isEditing = Boolean(destination?.id);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(19.0760);
  const [lng, setLng] = useState(72.8777);
  const [radiusM, setRadiusM] = useState(500);
  const [description, setDescription] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (destination) {
      setName(destination.name || '');
      setAddress(destination.address || '');
      setLat(destination.lat != null ? parseFloat(destination.lat) : 19.0760);
      setLng(destination.lng != null ? parseFloat(destination.lng) : 72.8777);
      setRadiusM(destination.radius_m != null ? parseInt(destination.radius_m) : 500);
      setDescription(destination.description || '');
    } else {
      setName('');
      setAddress('');
      setLat(19.0760);
      setLng(72.8777);
      setRadiusM(500);
      setDescription('');
    }
    setError(null);
    setSearchResults([]);
    setSearchQuery('');
  }, [destination, isOpen]);

  if (!isOpen) return null;

  const handleMapClick = (newLat, newLng) => {
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await res.json();
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        setError('No locations found for this query.');
      }
    } catch (err) {
      setError('Failed to search location.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const newLat = parseFloat(parseFloat(result.lat).toFixed(6));
    const newLng = parseFloat(parseFloat(result.lon).toFixed(6));
    setLat(newLat);
    setLng(newLng);
    setAddress(result.display_name);
    if (!name) {
      // Pick first segment of display name
      const suggestedName = result.display_name.split(',')[0];
      setName(suggestedName);
    }
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Destination name is required.');
      return;
    }
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      setError('Valid latitude and longitude are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: parseInt(radiusM) || 500,
        description: description.trim() || null,
      };

      if (isEditing) {
        await api.patch(`/destinations/${destination.id}`, payload);
      } else {
        await api.post('/destinations', payload);
      }

      await reloadDestinations();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save destination');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          width: '94%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-card, #0f172a)',
          borderRadius: 16,
          border: '1px solid var(--border-default, #1e293b)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(220, 38, 38, 0.12) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(220, 38, 38, 0.2)',
                border: '1px solid rgba(220, 38, 38, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                {isEditing ? 'Edit Destination' : 'Add New Destination'}
              </h3>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                Pin location, set geofence proximity threshold & assign drivers
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
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

          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Search Address or Landmark
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="e.g. Bandra Kurla Complex, Sassoon Hospital Pune..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: 8,
                    background: 'var(--bg-input, #0b1120)',
                    border: '1px solid var(--border-default, #1e293b)',
                    color: '#f8fafc',
                    fontSize: 13,
                  }}
                />
                <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  background: '#1e293b',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  overflow: 'hidden',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectSearchResult(res)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      borderBottom: '1px solid #334155',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    📍 {res.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Mini-Map */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Map Location Picker (Click to place marker)
              </label>
              <span style={{ fontSize: 11, color: '#38bdf8' }}>
                📍 {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>

            <div
              style={{
                height: 220,
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--border-default, #1e293b)',
              }}
            >
              <MapContainer
                center={[lat, lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterController center={[lat, lng]} />
                <MapClickHandler onLocationSelect={handleMapClick} />
                <Marker position={[lat, lng]} icon={destIcon} />
                <Circle
                  center={[lat, lng]}
                  radius={radiusM}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '4, 6',
                  }}
                />
              </MapContainer>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                Destination Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KEM Hospital Delivery Depot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-input, #0b1120)',
                  border: '1px solid var(--border-default, #1e293b)',
                  color: '#f8fafc',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                Address / Area Description
              </label>
              <input
                type="text"
                placeholder="e.g. Rasta Peth, Pune"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-input, #0b1120)',
                  border: '1px solid var(--border-default, #1e293b)',
                  color: '#f8fafc',
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Coordinates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                Latitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-input, #0b1120)',
                  border: '1px solid var(--border-default, #1e293b)',
                  color: '#f8fafc',
                  fontSize: 13,
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                Longitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-input, #0b1120)',
                  border: '1px solid var(--border-default, #1e293b)',
                  color: '#f8fafc',
                  fontSize: 13,
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Radius Slider with live badge */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} style={{ color: '#ef4444' }} />
                Geofence Proximity Radius
              </label>
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}
              >
                {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={radiusM}
              onChange={(e) => setRadiusM(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#ef4444',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 2 }}>
              <span>100 m</span>
              <span>1,000 m</span>
              <span>2,500 m</span>
              <span>5,000 m</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
              Delivery Notes / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Use Gate No. 3 for emergency blood delivery and notify ICU desk..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--bg-input, #0b1120)',
                border: '1px solid var(--border-default, #1e293b)',
                color: '#f8fafc',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid var(--border-default, #1e293b)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary btn-sm"
              style={{ minWidth: 120 }}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Destination' : 'Save Destination'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
