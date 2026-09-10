import { useState } from 'react';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, Truck,
  MapPin, Phone, Mail, Award, Search, Zap,
  TrendingUp, Compass, ShieldAlert, Radio
} from 'lucide-react';

export default function HospitalReportView({ data, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 16px' }} />
        <div>Generating hospital delivery report & analytics...</div>
      </div>
    );
  }

  if (!data) return null;

  const { targetHospital, summary, hospitalBreakdowns, deliveries } = data;

  const filteredDeliveries = (deliveries || []).filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.destination_name?.toLowerCase().includes(term) ||
      d.driver_name?.toLowerCase().includes(term) ||
      d.source_name?.toLowerCase().includes(term) ||
      d.vehicle_number?.toLowerCase().includes(term) ||
      d.urgency?.toLowerCase().includes(term) ||
      d.destination_address?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* 1. Hospital Profile / Scope Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <Building2 size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {targetHospital ? targetHospital.name : 'All Hospitals & Collection Centers'}
              </span>
              {targetHospital && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.18)',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}>
                  Geofence: {targetHospital.radius_m}m Radius
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {targetHospital?.address && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} style={{ color: 'var(--color-primary)' }} /> {targetHospital.address}
                </span>
              )}
              {targetHospital?.lat && targetHospital?.lng && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  [{parseFloat(targetHospital.lat).toFixed(4)}, {parseFloat(targetHospital.lng).toFixed(4)}]
                </span>
              )}
              <span>
                Report Window: <strong style={{ color: 'var(--text-primary)' }}>{data.startDate.slice(0, 10)}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{data.endDate.slice(0, 10)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Emergency Share</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>
              {summary.total_deliveries > 0 ? Math.round((summary.emergency_count / summary.total_deliveries) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Analytical KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deliveries Completed</span>
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{summary.total_deliveries}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Total blood units transported
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency STAT</span>
            <span style={{ fontSize: 14 }}>🚨</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{summary.emergency_count}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Critical code-red shipments
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Delivery Time</span>
            <Clock size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{summary.avg_delivery_mins} <span style={{ fontSize: 13 }}>mins</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Swargate HQ to hospital
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unique Drivers</span>
            <Truck size={16} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>{summary.unique_drivers_count}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Distinct fleet drivers deployed
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Geofence Hits</span>
            <Radio size={16} style={{ color: '#34d399' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{summary.geofence_arrivals_count}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Automated perimeter arrivals
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Allocation</span>
            <span style={{ fontSize: 14 }}>🛵 / 🚐</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
            <span style={{ color: '#34d399' }}>{summary.vehicle_breakdown?.two_wheeler || 0}</span> 🛵 · <span style={{ color: '#38bdf8' }}>{summary.vehicle_breakdown?.four_wheeler || 0}</span> 🚐
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Two-wheeler vs Four-wheeler
          </div>
        </div>
      </div>

      {/* 3. Multi-Hospital Comparison Matrix (When "All Hospitals" selected) */}
      {hospitalBreakdowns && hospitalBreakdowns.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-default)', padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} style={{ color: '#38bdf8' }} />
            Hospital Blood Deliveries Comparison Matrix
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hospital Destination</th>
                  <th>Address</th>
                  <th>Deliveries Completed</th>
                  <th>Emergency STAT</th>
                  <th>Avg Delivery Time</th>
                  <th>Drivers Deployed</th>
                  <th>Geofence Arrivals</th>
                </tr>
              </thead>
              <tbody>
                {hospitalBreakdowns.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.address || 'Pune'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{h.total_deliveries}</td>
                    <td>
                      {h.emergency_count > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{h.emergency_count}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{h.avg_delivery_mins} mins</td>
                    <td>{h.unique_drivers}</td>
                    <td>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{h.geofence_arrivals}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Detailed Deliveries Log Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-default)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Hospital Delivery Records Log ({filteredDeliveries.length})
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Verified delivery shipments received at destination healthcare hubs
            </div>
          </div>

          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search hospital, driver, vehicle, urgency..."
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12 }}
            />
          </div>
        </div>

        <div className="table-container">
          {filteredDeliveries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No delivery records found for this hospital in the selected time duration.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Completed Date & Time</th>
                  <th>Destination Hospital</th>
                  <th>Assigned Driver</th>
                  <th>Driver Vehicle</th>
                  <th>Dispatch Origin</th>
                  <th>Urgency</th>
                  <th>Distance</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map(d => {
                  const isEmergency = d.urgency === 'emergency';
                  const isUrgent = d.urgency === 'urgent';
                  return (
                    <tr key={d.id}>
                      <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {d.completed_at ? d.completed_at.replace('T', ' ').slice(0, 16) : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <span>{d.destination_name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {d.driver_name}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: d.vehicle_type === 'four_wheeler' ? '#38bdf8' : '#34d399',
                          background: d.vehicle_type === 'four_wheeler' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                          padding: '2px 7px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {d.vehicle_type === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}
                          {d.vehicle_number ? ` · ${d.vehicle_number}` : ''}
                        </span>
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {d.source_name || 'Jankalyan Blood Centre HQ'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          background: isEmergency ? 'rgba(239, 68, 68, 0.2)' : isUrgent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                          color: isEmergency ? '#ef4444' : isUrgent ? '#f59e0b' : '#38bdf8',
                          border: `1px solid ${isEmergency ? '#ef4444' : isUrgent ? '#f59e0b' : 'rgba(56, 189, 248, 0.4)'}`,
                        }}>
                          {d.urgency || 'normal'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {d.distance_km ? `${parseFloat(d.distance_km).toFixed(1)} km` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {d.duration_mins ? `${d.duration_mins} mins` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
