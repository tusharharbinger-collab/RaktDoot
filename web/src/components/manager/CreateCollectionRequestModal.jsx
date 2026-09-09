import { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, Hospital, Truck, MapPin, Clock } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../common/ToastContainer';

export default function CreateCollectionRequestModal({
  isOpen,
  onClose,
  initialDestination = null,
  initialDriverId = null,
}) {
  const { destinations, fleetDriversList, reloadDestinations } = useSocket();
  const { addToast } = useToast();

  const [driverId, setDriverId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [sourceName, setSourceName] = useState('Jankalyan Blood Centre (Swargate HQ)');
  const [sourceLat, setSourceLat] = useState(18.5039);
  const [sourceLng, setSourceLng] = useState(73.8524);
  const [urgency, setUrgency] = useState('normal'); // normal, urgent, emergency
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Eligible destination hospitals (excluding home base)
  const hospitalList = destinations.filter(d => !d.is_home && d.id !== 'dest-home-001');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setDestinationId(initialDestination?.id || (hospitalList[0]?.id || ''));
      setDriverId(initialDriverId || (fleetDriversList[0]?.id || ''));
      setSourceName('Jankalyan Blood Centre (Swargate HQ)');
      setSourceLat(18.5039);
      setSourceLng(73.8524);
      setUrgency('normal');
      setNotes('');
    }
  }, [isOpen, initialDestination, initialDriverId, destinations]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destinationId) {
      setError('Please select a destination hospital.');
      return;
    }
    if (!driverId) {
      setError('Please select a driver from the fleet.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/assignments', {
        destination_id: destinationId,
        driver_id: driverId,
        source_name: sourceName,
        source_lat: sourceLat,
        source_lng: sourceLng,
        urgency,
        notes: notes.trim() || null,
      });

      if (res.data?.success) {
        await reloadDestinations();
        const dest = destinations.find(d => d.id === destinationId);
        const driver = fleetDriversList.find(d => d.id === driverId);

        addToast({
          type: urgency === 'emergency' ? 'urgent' : 'entry',
          title: `🩸 Collection Request Dispatched (${urgency.toUpperCase()})`,
          message: `Assigned to ${driver?.name || 'driver'} ➔ ${dest?.name || 'destination hospital'}. Notification sent to driver app!`,
        });

        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to dispatch collection request');
    } finally {
      setLoading(false);
    }
  };

  const selectedHospital = hospitalList.find(h => h.id === destinationId);
  const selectedDriver = fleetDriversList.find(d => d.id === driverId);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#0f172a',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
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
              <Hospital size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                New Blood Collection Request
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                Dispatch sample pickup and hospital delivery
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: 12.5,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Source Location (Defaulted to Jankalyan HQ) */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              🏥 Source Dispatch Location (Origin)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid #1e293b',
              color: '#f8fafc',
              fontSize: 12.5,
            }}>
              <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: 12.5,
                  fontWeight: 600,
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* 2. Destination Hospital Selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              🎯 Target Hospital / Collection Center
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: '#0b1120',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            >
              <option value="" disabled>-- Select Destination Hospital --</option>
              {hospitalList.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.address || 'Pune'}
                </option>
              ))}
            </select>
            {selectedHospital && (
              <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>
                📍 Geofence Radius: {selectedHospital.radius_m}m · Coordinates: {parseFloat(selectedHospital.lat).toFixed(4)}, {parseFloat(selectedHospital.lng).toFixed(4)}
              </div>
            )}
          </div>

          {/* 3. Driver Selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              🚚 Assign Delivery Driver
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: '#0b1120',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            >
              <option value="" disabled>-- Select Fleet Driver --</option>
              {fleetDriversList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.status?.toUpperCase()}) — {Math.round(d.speed || 0)} km/h
                </option>
              ))}
            </select>
            {selectedDriver && (
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                ● Driver Status: {selectedDriver.status} · Speed: {Math.round(selectedDriver.speed || 0)} km/h
              </div>
            )}
          </div>

          {/* 4. Urgency Level */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              ⚡ Urgency Priority
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'normal', label: 'Normal Routine', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
                { id: 'urgent', label: '⚠️ Urgent', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                { id: 'emergency', label: '🚨 STAT / Emergency', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
              ].map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: urgency === u.id ? `1.5px solid ${u.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    background: urgency === u.id ? u.bg : 'rgba(255, 255, 255, 0.03)',
                    color: urgency === u.id ? u.color : '#94a3b8',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Additional Sample Details & Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
              📝 Sample / Blood Unit Details & Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g., 4 units O+ PRBC urgent crossmatch sample, report to Dr. Kulkarni ICU"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: '#0b1120',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                fontSize: 12.5,
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 18px',
                background: urgency === 'emergency' ? '#dc2626' : '#b91c1c',
              }}
            >
              <Send size={14} />
              <span>{loading ? 'Dispatching...' : 'Dispatch Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
