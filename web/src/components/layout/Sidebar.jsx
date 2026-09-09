import { NavLink, useNavigate } from 'react-router-dom';
import {
  Map, Users, AlertTriangle, BarChart3,
  Settings, LogOut, Wifi, WifiOff, Shield, Truck,
  MapPin, Bell, Smartphone, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import omBloodDropIcon from '../../assets/om_blood_drop.svg';
import nabhBadgeIcon from '../../assets/nabh_accredited_badge_real.png';
import { useLanguage } from '../../context/LanguageContext';

function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      id={`nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon size={16} className="nav-icon" />
      <span>{label}</span>
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { connected, issues, unreadNotificationsCount } = useSocket();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const managerNav = [
    { to: '/manager/map', icon: Map, label: t.liveVehicleTracking },
    { to: '/manager/destinations', icon: MapPin, label: t.destinations || 'Destinations' },
    { to: '/manager/notifications', icon: Bell, label: t.notifications || 'Notifications', badge: unreadNotificationsCount },
    { to: '/manager/issues', icon: AlertTriangle, label: t.issuesFeed },
  ];

  const adminNav = [
    { to: '/admin/users', icon: Users, label: t.userManagement },
    { to: '/admin/telemetry', icon: BarChart3, label: t.telemetry },
  ];

  const openIssues = issues.filter(i => i.status === 'open').length;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const isAdmin = user?.role === 'admin';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  return (
    <aside className="sidebar">
      {/* Brand Header with Jankalyan & NABH Logos */}
      <div
        className="sidebar-logo"
        onClick={() => navigate(isAdmin ? '/admin/users' : '/manager/map')}
        style={{
          height: 'var(--topbar-height)',
          padding: '0 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.12) 0%, transparent 100%)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Go to Map"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <img
              src={omBloodDropIcon}
              alt="Jankalyan Blood Centre"
              style={{ width: 24, height: 24, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(220, 38, 38, 0.6))' }}
            />
            <img
              src={nabhBadgeIcon}
              alt="NABH Accredited"
              style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: '50%' }}
            />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#ffffff', letterSpacing: '0.3px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              RAKTDOOT TRACKER
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Jankalyan Blood Centre
            </div>
          </div>
        </div>
      </div>

      {/* Connection indicator */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span style={{ fontWeight: 600 }}>{connected ? t.liveConnected : t.disconnected}</span>
          {connected && <span className="badge-dot pulse" style={{ marginLeft: 'auto' }} />}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {isManagerOrAdmin && (
          <>
            <div className="nav-section-label">{t.dispatchOps}</div>
            {managerNav.map(n => (
              <NavItem key={n.to} {...n} badge={n.to === '/manager/issues' ? openIssues : (n.badge || 0)} />
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="nav-section-label" style={{ marginTop: 'var(--space-3)' }}>{t.administration}</div>
            {adminNav.map(n => <NavItem key={n.to} {...n} />)}
          </>
        )}

        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="nav-section-label">Mobile App</div>
          <a
            href="https://raktdoot-backend.onrender.com/driver"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            id="nav-driver-mobile-app"
            title="Open Driver Mobile App on Phone"
          >
            <Smartphone size={16} className="nav-icon" style={{ color: '#10b981' }} />
            <span>Driver App (Live)</span>
          </a>
          <a
            href="https://raktdoot-backend.onrender.com/download/driver-app"
            className="nav-item"
            id="nav-download-driver-zip"
            title="Download Driver App Source ZIP"
          >
            <Download size={16} className="nav-icon" style={{ color: '#3b82f6' }} />
            <span>Download ZIP</span>
          </a>
        </div>

        <div style={{ marginTop: 'var(--space-3)' }}>
          <div className="nav-section-label">{t.system}</div>
          <NavItem to="/settings" icon={Settings} label={t.settings} />
        </div>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar" style={{ background: user?.avatar_color || '#b91c1c' }}>
            {initials}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button
            id="btn-logout"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={logout}
            title={t.signOut}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
