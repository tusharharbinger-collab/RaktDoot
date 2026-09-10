import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import IssueFeed from '../components/manager/IssueFeed';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';
import harbingerLogo from '../assets/harbinger_logo_actual.png';

export default function ManagerIssuesPage() {
  const { reloadIssues } = useSocket();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  // Sync issues on mount and poll every 10 seconds as safety net
  useEffect(() => {
    reloadIssues?.();
    const interval = setInterval(() => {
      reloadIssues?.();
    }, 10000);
    return () => clearInterval(interval);
  }, [reloadIssues]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await reloadIssues?.();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  return (
    <div className="page-content-full">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            flexShrink: 0,
          }}>
            <AlertTriangle size={16} style={{ color: '#f87171' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="topbar-title" style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                {t.issuesTitle}
              </div>
              <span style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                letterSpacing: '0.4px',
              }}>
                RAKTDOOT TRACKER
              </span>
            </div>
            <div className="topbar-subtitle" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t.issuesSubtitle}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            title="Refresh issues feed"
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <LanguageToggle />
          <div style={{ height: 26, width: 1, background: 'var(--border-default)' }} />
          <img
            src={harbingerLogo}
            alt="Harbinger Group"
            style={{ height: 26, objectFit: 'contain' }}
            title="Harbinger Group"
          />
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <IssueFeed />
      </div>
    </div>
  );
}
