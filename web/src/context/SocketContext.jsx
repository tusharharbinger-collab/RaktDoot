import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [fleetDrivers, setFleetDrivers] = useState({});
  const [issues, setIssues] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const reloadDestinations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/destinations');
      if (res.data?.success) {
        setDestinations(res.data.data || []);
      }
    } catch (err) {
      console.error('[Destinations] Load error:', err.message);
    }
  }, [token]);

  const reloadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadNotificationsCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[Notifications] Load error:', err.message);
    }
  }, [token]);

  const markNotificationRead = useCallback(async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[Notifications] Mark read error:', err.message);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err.message);
    }
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setDestinations([]);
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }

    // Load initial destinations and notifications for managers/admins
    if (user.role === 'manager' || user.role === 'admin') {
      reloadDestinations();
      reloadNotifications();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.error('[Socket] connect_error:', err.message));

    // ── Manager / Admin events ──
    socket.on('initial_fleet_state', ({ drivers, destinations: initDests }) => {
      const map = {};
      drivers.forEach(d => { map[d.id] = d; });
      setFleetDrivers(map);

      if (initDests && Array.isArray(initDests)) {
        setDestinations(initDests);
      }
    });

    socket.on('fleet_update', (update) => {
      setFleetDrivers(prev => ({
        ...prev,
        [update.driver_id]: {
          ...(prev[update.driver_id] || {}),
          id: update.driver_id,
          name: update.driver_name,
          avatar_color: update.avatar_color,
          lat: update.lat,
          lng: update.lng,
          speed: update.speed,
          heading: update.heading,
          status: update.status,
          address: update.address !== undefined ? update.address : prev[update.driver_id]?.address,
          updated_at: update.updated_at,
        },
      }));
    });

    socket.on('driver_status_changed', (data) => {
      setFleetDrivers(prev => ({
        ...prev,
        [data.driver_id]: {
          ...(prev[data.driver_id] || {}),
          id: data.driver_id,
          name: data.driver_name,
          status: data.status,
          updated_at: data.timestamp,
        },
      }));
    });

    socket.on('issue_alert', (data) => {
      const issue = data?.issue || data;
      setIssues(prev => [issue, ...prev].slice(0, 100));
    });

    socket.on('issue_updated', ({ issue }) => {
      setIssues(prev => prev.map(i => i.id === issue.id ? issue : i));
    });

    // ── Destination & Geofence events ──
    socket.on('destination_updated', ({ action, destination, destinationId }) => {
      if (action === 'create' && destination) {
        setDestinations(prev => {
          if (prev.some(d => d.id === destination.id)) return prev;
          return [destination, ...prev];
        });
      } else if (action === 'update' && destination) {
        setDestinations(prev => prev.map(d => d.id === destination.id ? destination : d));
      } else if (action === 'delete') {
        const targetId = destinationId || destination?.id;
        setDestinations(prev => prev.filter(d => d.id !== targetId));
      }
    });

    socket.on('assignment_status_changed', ({ assignment }) => {
      // Refresh destinations to display current driver assignment states
      if (assignment) {
        setDestinations(prev =>
          prev.map(d => {
            if (d.id === assignment.destination_id) {
              return {
                ...d,
                active_assignment_id: assignment.id,
                assignment_status: assignment.status,
                assigned_driver_id: assignment.driver_id,
                assigned_driver_name: assignment.driver_name || d.assigned_driver_name,
                assigned_driver_avatar: assignment.driver_avatar || d.assigned_driver_avatar,
              };
            }
            return d;
          })
        );
      }
      reloadDestinations();
    });

    socket.on('geofence_alert', (data) => {
      if (data?.notification) {
        setNotifications(prev => [data.notification, ...prev].slice(0, 100));
        setUnreadNotificationsCount(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, reloadDestinations, reloadNotifications]);

  // Emit from driver context
  const emitLocationUpdate = useCallback((data) => {
    socketRef.current?.emit('location_update', data);
  }, []);

  const emitStatusChange = useCallback((status) => {
    socketRef.current?.emit('status_change', { status });
  }, []);

  const emitIssueReported = useCallback((data) => {
    socketRef.current?.emit('issue_reported', data);
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      fleetDrivers,
      fleetDriversList: Object.values(fleetDrivers),
      issues, setIssues,
      destinations, setDestinations,
      reloadDestinations,
      notifications, setNotifications,
      unreadNotificationsCount,
      reloadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      emitLocationUpdate, emitStatusChange, emitIssueReported,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
