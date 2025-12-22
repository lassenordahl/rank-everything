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
import { loggingService } from './lib/loggingService';

const queryClient = new QueryClient();

// Global error handlers for unhandled rejections and errors
// Global error handlers for unhandled rejections and errors
// These prevent silent crashes that could cause white screens
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);

  loggingService.log({
    level: 'error',
    type: 'unhandled_rejection',
    message: String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });

  // Prevent the default behavior (which may cause issues on some browsers)
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error);

  loggingService.log({
    level: 'error',
    type: 'unhandled_error',
    message: event.message,
    stack: event.error?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });

  // Don't prevent default - let the error boundary handle it if possible
});

// Track page visibility changes - crashes often happen when tab is backgrounded
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    loggingService.log({
      level: 'info',
      type: 'page_hidden',
      message: 'Page moved to background',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });
    // Force flush when going to background
    loggingService.forceFlush();
  }
});

// pagehide is more reliable than beforeunload on mobile
window.addEventListener('pagehide', () => {
  loggingService.log({
    level: 'info',
    type: 'page_hide',
    message: 'Page hiding (potential navigation or crash)',
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });
  loggingService.forceFlush();
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
