import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api, { SOCKET_URL } from '../services/api';

const SocketContext = createContext(null);

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

  const deleteNotification = useCallback(async (id) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data?.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (res.data.unreadCount !== undefined) {
          setUnreadNotificationsCount(res.data.unreadCount);
        } else {
          setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('[Notifications] Delete error:', err.message);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      const res = await api.delete('/notifications/clear-all');
      if (res.data?.success) {
        setNotifications([]);
        setUnreadNotificationsCount(0);
      }
    } catch (err) {
      console.error('[Notifications] Clear all error:', err.message);
    }
  }, []);

  const deleteIssue = useCallback(async (id) => {
    try {
      const res = await api.delete(`/issues/${id}`);
      if (res.data?.success) {
        setIssues(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('[Issues] Delete error:', err.message);
      throw err;
    }
  }, []);

  const clearIssues = useCallback(async (status) => {
    try {
      const url = status && status !== 'all' ? `/issues/clear?status=${status}` : '/issues/clear';
      const res = await api.delete(url);
      if (res.data?.success) {
        setIssues(prev => (status && status !== 'all' ? prev.filter(i => i.status !== status) : []));
      }
    } catch (err) {
      console.error('[Issues] Clear error:', err.message);
      throw err;
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

    // 1. Immediately fetch initial drivers & issues via REST API so map loads without waiting for socket
    if (user.role === 'manager' || user.role === 'admin') {
      reloadDestinations();
      reloadNotifications();

      api.get('/drivers')
        .then(res => {
          if (res.data?.data && Array.isArray(res.data.data)) {
            const map = {};
            res.data.data.forEach(d => { map[d.id] = d; });
            setFleetDrivers(prev => ({ ...map, ...prev }));
          }
        })
        .catch(err => console.warn('[Fleet] Initial drivers fetch warning:', err.message));

      api.get('/issues')
        .then(res => {
          if (res.data?.data && Array.isArray(res.data.data)) {
            setIssues(res.data.data);
          }
        })
        .catch(err => console.warn('[Fleet] Initial issues fetch warning:', err.message));
    }

    // 2. Connect Socket with websocket and polling transports for maximum cloud compatibility
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to backend at', SOCKET_URL);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.error('[Socket] connect_error:', err.message));

    // ── Manager / Admin events ──
    socket.on('initial_fleet_state', ({ drivers, destinations: initDests }) => {
      const map = {};
      drivers.forEach(d => {
        map[d.id] = {
          ...d,
          trail: d.lat && d.lng ? [[d.lat, d.lng]] : [],
          lastMovedTime: new Date(d.updated_at || 0).getTime(),
        };
      });
      setFleetDrivers(prev => ({ ...prev, ...map }));

      if (initDests && Array.isArray(initDests)) {
        setDestinations(initDests);
      }
    });

    socket.on('fleet_update', (update) => {
      setFleetDrivers(prev => {
        const existing = prev[update.driver_id] || {};
        const oldTrail = existing.trail || (existing.lat && existing.lng ? [[existing.lat, existing.lng]] : []);
        const newPoint = [update.lat, update.lng];

        let updatedTrail = oldTrail;
        const lastPoint = oldTrail[oldTrail.length - 1];
        if (!lastPoint || Math.abs(lastPoint[0] - newPoint[0]) > 0.00002 || Math.abs(lastPoint[1] - newPoint[1]) > 0.00002) {
          updatedTrail = [...oldTrail, newPoint].slice(-100);
        }

        return {
          ...prev,
          [update.driver_id]: {
            ...existing,
            id: update.driver_id,
            name: update.driver_name || existing.name,
            avatar_color: update.avatar_color || existing.avatar_color,
            lat: update.lat,
            lng: update.lng,
            speed: update.speed != null ? update.speed : (existing.speed || 0),
            heading: update.heading != null ? update.heading : (existing.heading || 0),
            status: update.status || existing.status || 'active',
            address: (update.address && update.address.trim() !== '') ? update.address : existing.address,
            updated_at: update.updated_at || new Date().toISOString(),
            trail: updatedTrail,
            lastMovedTime: Date.now(),
          },
        };
      });
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

    socket.on('issue_deleted', ({ id }) => {
      setIssues(prev => prev.filter(i => i.id !== id));
    });

    socket.on('issues_cleared', ({ status }) => {
      setIssues(prev => (status && status !== 'all' ? prev.filter(i => i.status !== status) : []));
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
      deleteNotification,
      clearAllNotifications,
      deleteIssue,
      clearIssues,
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
