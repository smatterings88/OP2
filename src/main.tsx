import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ChatProvider } from './contexts/ChatContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>
);