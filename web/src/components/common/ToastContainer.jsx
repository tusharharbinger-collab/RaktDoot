import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// Pleasant Web Audio API synth chimes (no external assets needed)
function playTone(type = 'entry') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);

    if (type === 'completed') {
      // Ascending triumphant chime: C5 -> E5 -> G5 -> C6
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (type === 'urgent') {
      // Alert pulse: double beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.38);
    } else {
      // Gentle notification chime: D5 -> A5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (_) {
    // AudioContext blocked or not allowed prior to user interaction
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(({ title, message, type = 'entry', duration = 6500 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newToast = { id, title, message, type, createdAt: Date.now() };

    setToasts(prev => [newToast, ...prev].slice(0, 5));
    playTone(type);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 68,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
        maxWidth: 420,
        width: 'calc(100% - 40px)',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: toast.type === 'completed'
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : toast.type === 'urgent'
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid rgba(56, 189, 248, 0.45)',
              borderLeft: toast.type === 'completed'
                ? '4px solid #10b981'
                : toast.type === 'urgent'
                ? '4px solid #ef4444'
                : '4px solid #38bdf8',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: toast.type === 'completed'
                ? 'rgba(16, 185, 129, 0.18)'
                : toast.type === 'urgent'
                ? 'rgba(239, 68, 68, 0.18)'
                : 'rgba(56, 189, 248, 0.18)',
              color: toast.type === 'completed' ? '#34d399' : toast.type === 'urgent' ? '#f87171' : '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}>
              {toast.type === 'completed' ? (
                <CheckCircle2 size={18} />
              ) : toast.type === 'urgent' ? (
                <AlertTriangle size={18} />
              ) : (
                <Bell size={18} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: toast.type === 'completed' ? '#34d399' : toast.type === 'urgent' ? '#f87171' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {toast.title}
              </div>
              <div style={{
                fontSize: 12,
                color: '#cbd5e1',
                marginTop: 3,
                lineHeight: 1.4,
              }}>
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return ctx;
}
