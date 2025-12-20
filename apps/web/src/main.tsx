import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionStatusProvider } from './contexts/ConnectionStatusContext';
import { PartySocketProvider } from './contexts/PartySocketContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import { FLAG_OVERRIDES } from './lib/flag-overrides';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// Global error handlers for unhandled rejections and errors
// These prevent silent crashes that could cause white screens
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
  // Prevent the default behavior (which may cause issues on some browsers)
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error);
  // Don't prevent default - let the error boundary handle it if possible
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectionStatusProvider>
        <PartySocketProvider>
          <FeatureFlagProvider overrides={FLAG_OVERRIDES}>
            <BrowserRouter>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </FeatureFlagProvider>
        </PartySocketProvider>
      </ConnectionStatusProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
