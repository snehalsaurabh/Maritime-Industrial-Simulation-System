import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

class StudioErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | undefined }
> {
  state: { error: Error | undefined } = { error: undefined };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <main className="studio-fallback">
          <h1>Device Definition Studio</h1>
          <p>Renderer startup failed.</p>
          <pre>{this.state.error.message}</pre>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StudioErrorBoundary>
      <App />
    </StudioErrorBoundary>
  </React.StrictMode>
);
