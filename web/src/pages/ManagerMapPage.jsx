import { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MapIcon, PanelLeftClose, PanelLeft, Plus, Send, Shield } from 'lucide-react';
import FleetMap from '../components/map/FleetMap';
import DriverList from '../components/manager/DriverList';
import DriverDetailsDrawer from '../components/manager/DriverDetailsDrawer';
import DestinationModal from '../components/manager/DestinationModal';
import AssignDriverModal from '../components/manager/AssignDriverModal';
import CreateCollectionRequestModal from '../components/manager/CreateCollectionRequestModal';
import GeofenceControlPanel, { getHaversineDistanceKm } from '../components/manager/GeofenceControlPanel';
import { ToastProvider, useToast } from '../components/common/ToastContainer';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';

import harbingerLogo from '../assets/harbinger_logo_actual.png';

const DEFAULT_HOME_CENTER = {
  id: 'default-home',
  name: 'Jankalyan Blood Centre (Swargate HQ)',
  address: 'Swargate, Pune, Maharashtra 411042',
  lat: 18.5039,
  lng: 73.8524,
};

function ManagerMapContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { socket, fleetDriversList, destinations, reloadDestinations } = useSocket();
  const { addToast } = useToast();

  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [showDriverList, setShowDriverList] = useState(true);

  // Geofence states: 1 to 30 KM radius, centered on Jankalyan Swargate HQ by default
  const [geofenceCenter, setGeofenceCenter] = useState(DEFAULT_HOME_CENTER);
  const [radiusKm, setRadiusKm] = useState(5);

  // Modals
  const [isAddDestinationOpen, setIsAddDestinationOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [assigningDestination, setAssigningDestination] = useState(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionModalDriverId, setCollectionModalDriverId] = useState(null);
  const [collectionModalDestination, setCollectionModalDestination] = useState(null);

  // ── Hysteresis Proximity Entry Detection State Machine ──
  // driverProximityState: Map<driverId, boolean (isCurrentlyInside)>
  const driverProximityState = useRef(new Map());
  const initialMountRef = useRef(true);

  useEffect(() => {
    // Skip firing mass alerts on the very first render load
    if (initialMountRef.current) {
      fleetDriversList.forEach(driver => {
        if (driver.lat && driver.lng) {
          const dist = getHaversineDistanceKm(geofenceCenter.lat, geofenceCenter.lng, driver.lat, driver.lng);
          const isInside = dist != null && dist <= radiusKm;
          driverProximityState.current.set(driver.id, isInside);
        }
      });
      initialMountRef.current = false;
      return;
    }

    // Evaluate proximity transitions on every live telemetry update or radius change
    fleetDriversList.forEach(driver => {
      if (!driver.lat || !driver.lng || (driver.lat === 0 && driver.lng === 0)) return;

      const dist = getHaversineDistanceKm(geofenceCenter.lat, geofenceCenter.lng, driver.lat, driver.lng);
      if (dist == null) return;

      const isInsideNow = dist <= radiusKm;
      const wasInside = driverProximityState.current.get(driver.id) || false;

      // Transition: Outside ➔ Inside
      if (isInsideNow && !wasInside) {
        driverProximityState.current.set(driver.id, true);
        addToast({
          type: 'entry',
          title: `🔔 Geofence Entry Alert (${radiusKm} KM)`,
          message: `Driver ${driver.name} has entered the ${radiusKm} KM radius of ${geofenceCenter.name}! (${dist} km away)`,
          duration: 7000,
        });
      }
      // Transition: Inside ➔ Outside (re-enables alert when driver re-enters later)
      else if (!isInsideNow && wasInside) {
        driverProximityState.current.set(driver.id, false);
      }
    });
  }, [fleetDriversList, radiusKm, geofenceCenter, addToast]);

  // ── Real-time Socket Event Handlers ──
  useEffect(() => {
    if (!socket) return;

    // Work completed alert from driver app
    const handleWorkCompleted = (data) => {
      addToast({
        type: 'completed',
        title: '🎉 WORK COMPLETED',
        message: data.message || `Driver ${data.driver_name} reached ${data.destination_name} and completed the blood collection task!`,
        duration: 9000,
      });
      reloadDestinations();
    };

    // Live assignment / collection request updates
    const handleRequestUpdated = (data) => {
      reloadDestinations();
    };

    socket.on('work_completed_alert', handleWorkCompleted);
    socket.on('request_status_updated', handleRequestUpdated);

    return () => {
      socket.off('work_completed_alert', handleWorkCompleted);
      socket.off('request_status_updated', handleRequestUpdated);
    };
  }, [socket, addToast, reloadDestinations]);

  // Dispatch request handler for a specific driver
  const handleOpenCollectionRequest = useCallback((driverId = null, destination = null) => {
    setCollectionModalDriverId(driverId);
    setCollectionModalDestination(destination);
    setIsCollectionModalOpen(true);
  }, []);

  return (
    <div className="page-content-full">
      {/* Streamlined Topbar */}
      <div className="topbar" style={{ padding: '10px 20px', minHeight: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Toggle Fleet List Button */}
          <button
            onClick={() => setShowDriverList(prev => !prev)}
            className="btn btn-ghost btn-icon btn-sm"
            title={showDriverList ? "Collapse Fleet Panel" : "Show Fleet Panel"}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-default)',
              color: showDriverList ? 'var(--color-primary-light)' : 'var(--text-muted)',
            }}
          >
            {showDriverList ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>

          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--color-primary-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(220, 38, 38, 0.45)',
            flexShrink: 0,
          }}>
            <MapIcon size={16} style={{ color: 'var(--color-primary-light)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="topbar-title" style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
              {t.liveBloodTransportTracking}
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 12,
              letterSpacing: '0.3px',
            }}>
              <span className="badge-dot pulse" style={{ background: '#10b981', width: 6, height: 6 }} />
              {t.liveDispatchBadge}
            </span>
          </div>
        </div>

        {/* Right side: Action Buttons, Language Toggle & Corporate Logo */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* New Collection Request Button */}
          <button
            id="btn-map-new-request"
            onClick={() => handleOpenCollectionRequest()}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 13px',
              fontSize: 12,
              background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
              boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)',
            }}
            title="Create and dispatch a blood sample collection request"
          >
            <Send size={13} />
            <span>New Collection Request</span>
          </button>

          {/* Add Destination Button */}
          <button
            id="btn-map-add-dest"
            onClick={() => setIsAddDestinationOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 12 }}
            title="Create a new delivery destination"
          >
            <Plus size={14} />
            <span>{t.addDestination || 'Add Destination'}</span>
          </button>

          <LanguageToggle />

          <div style={{ height: 20, width: 1, background: 'var(--border-default)' }} />

          <img
            src={harbingerLogo}
            alt="Harbinger Group"
            style={{ height: 24, objectFit: 'contain', opacity: 0.9 }}
            title="Harbinger Group"
          />
        </div>
      </div>

      {/* Map + Driver list split */}
      <div className="map-panel-split" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {showDriverList && (
          <DriverList
            selectedId={selectedDriverId}
            onSelect={setSelectedDriverId}
            onClose={() => setShowDriverList(false)}
          />
        )}

        <div className="map-panel-map" style={{ flex: 1, minWidth: 0, width: '100%', height: '100%', position: 'relative' }}>
          {/* Interactive Geofence Radius Control Panel */}
          <GeofenceControlPanel
            geofenceCenter={geofenceCenter}
            onChangeCenter={setGeofenceCenter}
            radiusKm={radiusKm}
            onChangeRadius={setRadiusKm}
            destinations={destinations}
            drivers={fleetDriversList}
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
          />

          <FleetMap
            selectedDriverId={selectedDriverId}
            onSelectDriver={setSelectedDriverId}
            isListCollapsed={!showDriverList}
            destinations={destinations}
            geofenceCenter={geofenceCenter}
            radiusKm={radiusKm}
            onAssignDriver={(dest) => setAssigningDestination(dest)}
            onEditDestination={(dest) => setEditingDestination(dest)}
            onCreateCollectionRequest={(driverId) => handleOpenCollectionRequest(driverId)}
          />
        </div>
      </div>

      {/* Driver details drawer */}
      {selectedDriverId && (
        <DriverDetailsDrawer
          driverId={selectedDriverId}
          onClose={() => setSelectedDriverId(null)}
        />
      )}

      {/* Modals */}
      <CreateCollectionRequestModal
        isOpen={isCollectionModalOpen}
        onClose={() => {
          setIsCollectionModalOpen(false);
          setCollectionModalDriverId(null);
          setCollectionModalDestination(null);
        }}
        initialDriverId={collectionModalDriverId}
        initialDestination={collectionModalDestination}
      />

      <DestinationModal
        isOpen={isAddDestinationOpen}
        onClose={() => setIsAddDestinationOpen(false)}
      />

      <DestinationModal
        isOpen={Boolean(editingDestination)}
        destination={editingDestination}
        onClose={() => setEditingDestination(null)}
      />

      <AssignDriverModal
        isOpen={Boolean(assigningDestination)}
        destination={assigningDestination}
        onClose={() => setAssigningDestination(null)}
      />
    </div>
  );
}

export default function ManagerMapPage() {
  return (
    <ToastProvider>
      <ManagerMapContent />
    </ToastProvider>
  );
}
