import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app, #0a0b0f)',
          color: '#f8fafc',
          padding: 24,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 500,
            width: '100%',
            background: 'var(--bg-card, #11131a)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            borderRadius: 16,
            padding: '32px 28px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(220, 38, 38, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertTriangle size={28} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, marginBottom: 20 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
