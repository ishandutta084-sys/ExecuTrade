import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('executrade_auth');
    localStorage.removeItem('theme');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0D1B3E',
          color: '#FFFFFF',
          padding: '32px 24px',
          fontFamily: 'ui-monospace, monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#080F1E',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{
                backgroundColor: '#EA7A24',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}>
                TI AUTOPILOT
              </span>
              <span style={{ color: '#EF4444', fontSize: '13px', fontWeight: 'bold' }}>
                RUNTIME DIAGNOSTIC
              </span>
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: '0 0 8px 0' }}>
              Interface Initialization Error
            </h2>
            <p style={{ fontSize: '12px', color: '#94A6C4', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              The application encountered an unexpected runtime exception. Details below:
            </p>

            <pre style={{
              backgroundColor: '#030712',
              color: '#F87171',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '11px',
              lineHeight: '1.4',
              overflowX: 'auto',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              margin: '0 0 16px 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {this.state.error?.toString() || 'Unknown runtime error'}
              {this.state.error?.stack && `\n\nStack:\n${this.state.error.stack}`}
            </pre>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#EA7A24',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Reload Console
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94A6C4',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear Cache & Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global unhandled error fallback
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#0D1B3E;color:#FFFFFF;padding:32px;font-family:monospace;display:flex;align-items:center;justify-content:center">
        <div style="max-width:600px;width:100%;background:#080F1E;border:1px solid #EA7A24;padding:24px;border-radius:8px">
          <h3 style="color:#EA7A24;margin-top:0">TI AUTOPILOT Boot Error</h3>
          <p style="color:#EF4444;font-size:12px">${event.message}</p>
          <pre style="background:#030712;padding:12px;border-radius:4px;font-size:11px;overflow:auto">${event.error?.stack || event.filename + ':' + event.lineno}</pre>
          <button onclick="localStorage.clear();location.reload()" style="margin-top:12px;background:#EA7A24;color:#FFF;border:none;padding:8px 16px;border-radius:4px;cursor:pointer">Clear Storage & Reload</button>
        </div>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Failed to locate #root mount element in document.');
}
