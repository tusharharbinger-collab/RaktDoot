import { useState, useEffect, useCallback } from 'react';
import { X, Send, AlertTriangle, Hospital, Truck, MapPin, Clock, Settings, Minus, Plus, Droplets, Droplet, Layers, Snowflake, Zap, Package } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../common/ToastContainer';
import { useAuth } from '../../context/AuthContext';
import BloodCategoryManagerModal from '../admin/BloodCategoryManagerModal';

const DEFAULT_CATEGORIES = [
  { id: 'bcat-plasma', code: 'plasma', name: 'Plasma', description: 'Fresh Frozen Plasma (FFP)' },
  { id: 'bcat-rbc', code: 'red_blood_cell', name: 'Red Blood Cell', description: 'Packed Red Blood Cells (PRBC)' },
  { id: 'bcat-cryo', code: 'cryo', name: 'Cryo', description: 'Cryoprecipitate Antihemophilic Factor' },
  { id: 'bcat-platelets', code: 'platelets', name: 'Platelets', description: 'Platelet Concentrates (SDP / RDP)' },
];

export default function CreateCollectionRequestModal({
  isOpen,
  onClose,
  initialDestination = null,
  initialDriverId = null,
}) {
  const { destinations, fleetDriversList, reloadDestinations } = useSocket();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [driverId, setDriverId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [sourceName, setSourceName] = useState('Jankalyan Blood Centre (Swargate HQ)');
  const [sourceLat, setSourceLat] = useState(18.5039);
  const [sourceLng, setSourceLng] = useState(73.8524);
  const [urgency, setUrgency] = useState('normal'); // normal, urgent, emergency
  // Combination bag counts by category code (e.g. { red_blood_cell: 4, cryo: 3 })
  const [componentCounts, setComponentCounts] = useState({ red_blood_cell: 1 });
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES);
  const [showCatManager, setShowCatManager] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Eligible destination hospitals (excluding home base)
  const hospitalList = destinations.filter(d => !d.is_home && d.id !== 'dest-home-001');

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/blood-categories');
      if (res.data?.success && res.data.data?.length > 0) {
        setCategoriesList(res.data.data);
      }
    } catch (_) {
      // Fallback to default categories
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setDestinationId(initialDestination?.id || (hospitalList[0]?.id || ''));
      setDriverId(initialDriverId || (fleetDriversList[0]?.id || ''));
      setSourceName('Jankalyan Blood Centre (Swargate HQ)');
      setSourceLat(18.5039);
      setSourceLng(73.8524);
      setUrgency('normal');
      setComponentCounts({ red_blood_cell: 1 });
      setNotes('');
      loadCategories();
    }
  }, [isOpen, initialDestination, initialDriverId, destinations, loadCategories]);

  const getCount = (code) => componentCounts[code] || 0;

  const updateCount = (code, delta) => {
    setComponentCounts(prev => {
      const current = prev[code] || 0;
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [code]: nextVal };
    });
  };

  const totalUnits = Object.values(componentCounts).reduce((sum, count) => sum + (count || 0), 0);

  const activeComponents = categoriesList
    .map(c => ({
      ...c,
      count: componentCounts[c.code] || 0
    }))
    .filter(c => c.count > 0);

  const getCompositeCategory = () => {
    if (activeComponents.length === 0) return 'red_blood_cell';
    if (activeComponents.length === 1) return activeComponents[0].code;
    return activeComponents.map(c => `${c.count} ${c.name}`).join(' + ');
  };

  const getSummaryTitle = () => {
    if (activeComponents.length === 0) return '0 Bags';
    if (activeComponents.length === 1) {
      const c = activeComponents[0];
      return `${c.count} ${c.count > 1 ? 'Bags' : 'Bag'} · ${c.name}`;
    }
    return `${totalUnits} Bags (${activeComponents.map(c => `${c.count} ${c.name}`).join(', ')})`;
  };

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
    if (totalUnits === 0) {
      setError('Please select at least 1 blood component bag (quantity must be at least 1).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const finalCategory = getCompositeCategory();
      const orderSummaryText = activeComponents.map(c => `${c.count} ${c.name}`).join(', ');
      const finalNotes = notes.trim()
        ? (activeComponents.length > 1 ? `${notes.trim()} [Order Breakdown: ${orderSummaryText}]` : notes.trim())
        : (activeComponents.length > 1 ? `Combination Order: ${orderSummaryText}` : null);

      const res = await api.post('/assignments', {
        destination_id: destinationId,
        driver_id: driverId,
        source_name: sourceName,
        source_lat: sourceLat,
        source_lng: sourceLng,
        urgency,
        category: finalCategory,
        unit_count: totalUnits,
        notes: finalNotes,
      });

      if (res.data?.success) {
        await reloadDestinations();
        const dest = destinations.find(d => d.id === destinationId);
        const driver = fleetDriversList.find(d => d.id === driverId);

        addToast({
          type: urgency === 'emergency' ? 'urgent' : 'entry',
          title: `${getSummaryTitle()} Dispatched (${urgency.toUpperCase()})`,
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
          maxWidth: 680,
          maxHeight: '92vh',
          background: '#0b1120',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
              }}
            >
              <Hospital size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.2px' }}>
                New Blood Collection Request
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                Dispatch sample pickup and hospital delivery route
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Route & Dispatch Logistics */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={13} />
              <span>Dispatch Logistics & Route</span>
            </div>

            {/* Row 1: Origin & Target Hospital */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
              {/* Origin */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                  Origin (Source Hub)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#131c2e',
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

              {/* Destination Hospital */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                  Target Hospital / Destination *
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: '#131c2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                >
                  <option value="" disabled>-- Select Destination Hospital --</option>
                  {hospitalList.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.address ? `(${h.address.split(',')[0]})` : ''}
                    </option>
                  ))}
                </select>
                {selectedHospital && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    📍 Geofence: <span style={{ color: '#38bdf8' }}>{selectedHospital.radius_m}m radius</span> · {selectedHospital.address || 'Pune'}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Driver & Urgency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Assign Driver */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                  Assign Fleet Driver *
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    background: '#131c2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                >
                  <option value="" disabled>-- Select Fleet Driver --</option>
                  {fleetDriversList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} [{d.vehicle_type === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}{d.vehicle_number ? ` · ${d.vehicle_number}` : ''}]
                    </option>
                  ))}
                </select>
                {selectedDriver && (
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ textTransform: 'capitalize' }}>{selectedDriver.status}</span>
                    <span style={{ color: '#475569' }}>·</span>
                    <span style={{ color: selectedDriver.vehicle_type === 'four_wheeler' ? '#38bdf8' : '#34d399', fontWeight: 600 }}>
                      {selectedDriver.vehicle_type === 'four_wheeler' ? '🚐 4-Wheeler' : '🛵 2-Wheeler'} {selectedDriver.vehicle_number ? `(${selectedDriver.vehicle_number})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Urgency Level */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                  Dispatch Priority
                </label>
                <div style={{ display: 'flex', gap: 6, height: 38 }}>
                  {[
                    { id: 'normal', label: 'Routine', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' },
                    { id: 'urgent', label: 'Urgent', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
                    { id: 'emergency', label: 'STAT Alert', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.22)' },
                  ].map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUrgency(u.id)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        border: urgency === u.id ? `1.5px solid ${u.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                        background: urgency === u.id ? u.bg : '#131c2e',
                        color: urgency === u.id ? u.color : '#94a3b8',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: u.color,
                        opacity: urgency === u.id ? 1 : 0.4,
                      }} />
                      <span>{u.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Blood Component & Units Specifications */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            {/* Category Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Droplets size={13} />
                <span>Blood Component & Quantity</span>
              </div>
              {user?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowCatManager(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                  title="Admin: Edit Blood Component Categories"
                >
                  <Settings size={12} />
                  <span>Edit Categories</span>
                </button>
              )}
            </div>

            {/* Blood Category Cards with Integrated Bag Counters for Any Combination */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8, marginBottom: 12 }}>
              {categoriesList.map((cat) => {
                const count = getCount(cat.code);
                const isSelected = count > 0;
                let accent = '#ef4444';
                let shortBadge = 'PRBC';
                let CatIcon = Droplet;

                if (cat.code === 'plasma') {
                  accent = '#f59e0b';
                  shortBadge = 'FFP';
                  CatIcon = Layers;
                } else if (cat.code === 'cryo') {
                  accent = '#38bdf8';
                  shortBadge = 'CRYO';
                  CatIcon = Snowflake;
                } else if (cat.code === 'platelets') {
                  accent = '#a855f7';
                  shortBadge = 'SDP';
                  CatIcon = Zap;
                } else if (cat.code === 'red_blood_cell' || cat.code === 'rbc') {
                  accent = '#ef4444';
                  shortBadge = 'PRBC';
                  CatIcon = Droplet;
                } else {
                  shortBadge = cat.code.replace(/_/g, '').toUpperCase().slice(0, 4);
                  CatIcon = Package;
                }

                return (
                  <div
                    key={cat.code || cat.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: isSelected ? `1.5px solid ${accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? `${accent}16` : '#131c2e',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 0 12px ${accent}25` : 'none',
                    }}
                  >
                    {/* Top Row: Icon + Name + Badge */}
                    <div
                      onClick={() => count === 0 ? updateCount(cat.code, 1) : null}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        cursor: count === 0 ? 'pointer' : 'default',
                      }}
                      title={count === 0 ? `Click to add ${cat.name}` : cat.name}
                    >
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: isSelected ? `${accent}33` : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accent,
                        flexShrink: 0,
                      }}>
                        <CatIcon size={14} />
                      </div>
                      <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: isSelected ? accent : '#64748b', letterSpacing: '0.4px', marginTop: 1 }}>
                          {shortBadge}
                        </div>
                      </div>
                    </div>

                    {/* Stepper / Add button */}
                    {count === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateCount(cat.code, 1)}
                        style={{
                          width: '100%',
                          padding: '4px 0',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px dashed rgba(255, 255, 255, 0.12)',
                          color: '#94a3b8',
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Plus size={11} />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: `1px solid ${accent}40`,
                        borderRadius: 6,
                        padding: '2px 4px',
                      }}>
                        <button
                          type="button"
                          onClick={() => updateCount(cat.code, -1)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Reduce 1 bag"
                        >
                          <Minus size={10} />
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#ffffff', minWidth: 38, textAlign: 'center' }}>
                          {count} {count === 1 ? 'Bag' : 'Bags'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCount(cat.code, 1)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: `${accent}25`,
                            border: 'none',
                            color: accent,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Add 1 bag"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: Selected Combination Summary & Delivery Instructions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Left: Combination Details & Quick Presets */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Order Combination Summary
                  </label>
                  <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                    {totalUnits} {totalUnits === 1 ? 'Bag Total' : 'Bags Total'}
                  </span>
                </div>

                <div style={{
                  background: totalUnits > 0 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: totalUnits > 0 ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: totalUnits > 0 ? '#ffffff' : '#f87171' }}>
                    {activeComponents.length > 0
                      ? activeComponents.map(c => `${c.count} ${c.name}`).join(' + ')
                      : '⚠️ No bags selected. Click "Add" on any component above.'}
                  </div>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>PRESETS:</span>
                  <button
                    type="button"
                    onClick={() => setComponentCounts({ red_blood_cell: 1 })}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 5,
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      color: '#94a3b8',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    1 RBC
                  </button>
                  <button
                    type="button"
                    onClick={() => setComponentCounts({ red_blood_cell: 4, cryo: 3 })}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 5,
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    4 RBC + 3 Cryo
                  </button>
                  <button
                    type="button"
                    onClick={() => setComponentCounts({ red_blood_cell: 2, plasma: 2 })}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 5,
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      color: '#94a3b8',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    2 RBC + 2 Plasma
                  </button>
                  <button
                    type="button"
                    onClick={() => setComponentCounts({ platelets: 2 })}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 5,
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      color: '#94a3b8',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    2 Platelets
                  </button>
                </div>
              </div>

              {/* Right: Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>
                  Delivery Instructions / ICU Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Crossmatch sample, Dr. Kulkarni ICU, cold-chain temp..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: '#131c2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    fontSize: 12,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer with live summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 6,
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {/* Live order summary */}
            <div style={{ fontSize: 11.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '3px 8px',
                borderRadius: 12,
                color: '#fca5a5',
                fontWeight: 600,
              }}>
                <Droplet size={12} style={{ color: '#ef4444' }} />
                <span>{getSummaryTitle()}</span>
              </span>
              <span style={{ color: '#475569' }}>➔</span>
              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                {selectedHospital ? selectedHospital.name.split('—')[0].trim() : 'Hospital'}
              </span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: 12.5 }}
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
                  padding: '8px 20px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: urgency === 'emergency' ? '#dc2626' : '#b91c1c',
                }}
              >
                <Send size={14} />
                <span>{loading ? 'Dispatching...' : 'Dispatch Request'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Admin Blood Categories Manager Modal */}
      <BloodCategoryManagerModal
        isOpen={showCatManager}
        onClose={() => setShowCatManager(false)}
        onCategoriesChanged={loadCategories}
      />
    </div>
  );
}
