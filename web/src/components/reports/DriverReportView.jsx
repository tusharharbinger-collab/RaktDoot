import { useState } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, Truck,
  MapPin, Phone, Mail, Award, Search, Zap,
  TrendingUp, Compass, Activity, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function DriverReportView({ data, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 16px' }} />
        <div>Generating driver performance report & analytics...</div>
      </div>
    );
  }

  if (!data) return null;

  const { targetDriver, summary, driverBreakdowns, workLogs, assignments } = data;
  const trips = workLogs?.length > 0 ? workLogs : (assignments || []);

  const filteredTrips = trips.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.destination_name?.toLowerCase().includes(term) ||
      t.driver_name?.toLowerCase().includes(term) ||
      t.source_name?.toLowerCase().includes(term) ||
      t.vehicle_number?.toLowerCase().includes(term) ||
      t.urgency?.toLowerCase().includes(term)
    );
  });

  const initials = targetDriver?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'FL';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* 1. Driver Profile / Scope Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
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
          <div className="user-avatar" style={{
            background: targetDriver?.avatar_color || 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            width: 52,
            height: 52,
            fontSize: 18,
            fontWeight: 800,
            borderRadius: 14,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                {targetDriver ? targetDriver.name : 'All Fleet Drivers Combined'}
              </span>
              {targetDriver && (
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: targetDriver.vehicle_type === 'four_wheeler' ? '#38bdf8' : '#34d399',
                  background: targetDriver.vehicle_type === 'four_wheeler' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  border: `1px solid ${targetDriver.vehicle_type === 'four_wheeler' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}>
                  {targetDriver.vehicle_type === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}
                  {targetDriver.vehicle_number ? ` · ${targetDriver.vehicle_number}` : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {targetDriver?.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={12} /> {targetDriver.phone}
                </span>
              )}
              {targetDriver?.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> {targetDriver.email}
                </span>
              )}
              <span>
                Report Window: <strong style={{ color: 'var(--text-primary)' }}>{data.startDate.slice(0, 10)}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{data.endDate.slice(0, 10)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Acceptance Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: summary.acceptance_rate >= 90 ? '#34d399' : '#f59e0b' }}>
              {summary.acceptance_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Analytical KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Deliveries</span>
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{summary.completed_count}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Out of {summary.total_assigned} assigned tasks ({summary.completion_rate}%)
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Distance</span>
            <TrendingUp size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{summary.total_distance_km} <span style={{ fontSize: 13 }}>km</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Cold-chain transit mileage
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Transit Time</span>
            <Clock size={16} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{summary.total_duration_hours} <span style={{ fontSize: 13 }}>hrs</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Avg {summary.avg_duration_mins} mins per trip
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Speed</span>
            <Zap size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>{summary.avg_speed_kmh} <span style={{ fontSize: 13 }}>km/h</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Fleet transit velocity
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency STAT Deliveries</span>
            <span style={{ fontSize: 14 }}>🚨</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{summary.urgency_breakdown.emergency}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Critical life-saving requests
          </div>
        </div>

        <div className="stat-card" style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reported Breakdowns</span>
            <AlertTriangle size={16} style={{ color: summary.total_issues > 0 ? '#ef4444' : '#10b981' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: summary.total_issues > 0 ? '#ef4444' : '#10b981' }}>
            {summary.total_issues}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Incidents / vehicle delays
          </div>
        </div>
      </div>

      {/* 3. Multi-Driver Matrix Table (When "All Drivers" selected) */}
      {driverBreakdowns && driverBreakdowns.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-default)', padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} style={{ color: 'var(--color-primary)' }} />
            Fleet Drivers Comparative Performance Matrix
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Vehicle Profile</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Acceptance</th>
                  <th>Total Mileage</th>
                  <th>Transit Time</th>
                  <th>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {driverBreakdowns.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
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
                    <td>{d.total_assigned}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{d.completed_count}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: d.acceptance_rate >= 90 ? '#10b981' : d.acceptance_rate >= 75 ? '#f59e0b' : '#ef4444',
                      }}>
                        {d.acceptance_rate}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.total_distance_km} km</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(d.total_duration_mins / 60 * 10) / 10} hrs</td>
                    <td>
                      {d.issues_count > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>{d.issues_count}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Trips & Delivery Task History Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-default)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Delivery Trips & Work Logs Log ({filteredTrips.length})
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Detailed breakdown of all blood dispatch orders and route durations
            </div>
          </div>

          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search destination, urgency, driver..."
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12 }}
            />
          </div>
        </div>

        <div className="table-container">
          {filteredTrips.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No deliveries found for this driver and time duration.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Completed / Assigned Date</th>
                  <th>Driver</th>
                  <th>Vehicle Profile</th>
                  <th>Destination Hospital</th>
                  <th>Origin Hub</th>
                  <th>Urgency</th>
                  <th>Distance</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map(t => {
                  const isEmergency = t.urgency === 'emergency';
                  const isUrgent = t.urgency === 'urgent';
                  const dateStr = t.completed_at || t.assigned_at;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {dateStr ? dateStr.replace('T', ' ').slice(0, 16) : '—'}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.driver_name || targetDriver?.name || 'Driver'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: (t.vehicle_type || targetDriver?.vehicle_type) === 'four_wheeler' ? '#38bdf8' : '#34d399',
                          background: (t.vehicle_type || targetDriver?.vehicle_type) === 'four_wheeler' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                          padding: '2px 7px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {(t.vehicle_type || targetDriver?.vehicle_type) === 'four_wheeler' ? '🚐 Four Wheeler' : '🛵 Two Wheeler'}
                          {(t.vehicle_number || targetDriver?.vehicle_number) ? ` · ${t.vehicle_number || targetDriver?.vehicle_number}` : ''}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <span>{t.destination_name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {t.source_name || 'Jankalyan Blood Centre HQ'}
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
                          {t.urgency || 'normal'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.distance_km ? `${parseFloat(t.distance_km).toFixed(1)} km` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.duration_mins ? `${t.duration_mins} mins` : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${t.status === 'completed' || !t.status ? 'active' : t.status === 'rejected' ? 'offline' : 'idle'}`}>
                          {t.status || 'completed'}
                        </span>
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
