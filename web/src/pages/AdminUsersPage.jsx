import { useState } from 'react';
import { Users, Droplets } from 'lucide-react';
import UserManagementTable from '../components/admin/UserManagementTable';
import BloodCategoriesManagement from '../components/admin/BloodCategoriesManagement';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';
import harbingerLogo from '../assets/harbinger_logo_actual.png';

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'categories'

  return (
    <div className="page-content-full">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeTab === 'users' ? (
            <Users size={16} style={{ color: 'var(--color-primary)' }} />
          ) : (
            <Droplets size={16} style={{ color: '#ef4444' }} />
          )}
          <div>
            <div className="topbar-title">
              {activeTab === 'users' ? t.userMgmtTitle : 'Blood Categories & Unit Specifications'}
            </div>
            <div className="topbar-subtitle">
              {activeTab === 'users'
                ? t.userMgmtSubtitle
                : 'Admin configuration for Plasma, Red Blood Cells, Cryo, Platelets & Custom Blood Components'}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 24 }}>
          <button
            id="tab-admin-users"
            className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('users')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Users size={14} />
            <span>Users & Roles</span>
          </button>
          <button
            id="tab-admin-categories"
            className={`btn btn-sm ${activeTab === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('categories')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Droplets size={14} />
            <span>Blood Categories</span>
          </button>
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
        {activeTab === 'users' ? (
          <UserManagementTable />
        ) : (
          <BloodCategoriesManagement />
        )}
      </div>
    </div>
  );
}
