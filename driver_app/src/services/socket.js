import { io } from 'socket.io-client';

class DriverSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Set();
  }

  connect(serverUrl, token, onStateChange) {
    if (this.socket) {
      this.disconnect();
    }

    const cleanUrl = serverUrl.replace(/\/+$/, '');
    this.socket = io(cleanUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      onStateChange?.(true);
      console.log('[Driver Socket] Connected successfully to', cleanUrl);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      onStateChange?.(false);
      console.log('[Driver Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      this.isConnected = false;
      onStateChange?.(false);
      console.warn('[Driver Socket] Connection error:', err.message);
    });

    return this.socket;
  }

  emitLocationUpdate(telemetry) {
    if (!this.socket || !this.isConnected) return false;
    this.socket.emit('location_update', telemetry);
    return true;
  }

  emitStatusChange(status) {
    if (!this.socket || !this.isConnected) return false;
    this.socket.emit('status_change', { status });
    return true;
  }

  emitIssueReported(issue) {
    if (!this.socket || !this.isConnected) return false;
    this.socket.emit('issue_reported', issue);
    return true;
  }

  emitIssueAlert(issue) {
    return this.emitIssueReported(issue);
  }

  emitTaskResponse(assignmentId, status) {
    if (!this.socket || !this.isConnected) return false;
    this.socket.emit('task_response', { assignment_id: assignmentId, status });
    return true;
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketManager = new DriverSocketManager();
