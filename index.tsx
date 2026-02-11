import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AppErrorBoundary:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b1120', color: '#e2e8f0', padding: 24, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <h1 style={{ color: '#22d3ee', fontSize: 18 }}>エラーが発生しました</h1>
          <pre style={{ background: '#1e293b', padding: 16, borderRadius: 8, overflow: 'auto', maxWidth: '100%', fontSize: 12 }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);