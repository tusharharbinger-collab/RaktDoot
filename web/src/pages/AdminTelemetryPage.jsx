import { BarChart3 } from 'lucide-react';
import TelemetryStats from '../components/admin/TelemetryStats';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';
import harbingerLogo from '../assets/harbinger_logo_actual.png';

export default function AdminTelemetryPage() {
  const { t } = useLanguage();

  return (
    <div className="page-content-full">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={16} style={{ color: 'var(--color-primary)' }} />
          <div>
            <div className="topbar-title">{t.telemetryTitle}</div>
            <div className="topbar-subtitle">{t.telemetrySubtitle}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageToggle />
          <div style={{ height: 24, width: 1, background: 'var(--border-default)' }} />
          <img
            src={harbingerLogo}
            alt="Harbinger Group"
            style={{ height: 26, objectFit: 'contain', display: 'block' }}
            title="Harbinger Group"
          />
        </div>
      </div>
      <div className="page-content">
        <TelemetryStats />
      </div>
    </div>
  );
}
