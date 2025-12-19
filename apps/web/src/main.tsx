import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartySocketProvider } from './contexts/PartySocketContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PartySocketProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PartySocketProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
