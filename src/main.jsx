import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PremiumProvider } from './context/PremiumContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PremiumProvider>
          <App />
        </PremiumProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Daftarkan service worker buat PWA (syarat "installable" di Chrome/Edge).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Diamkan aja kalau gagal (misal browser lama) -- situs tetap jalan normal
    });
  });
}

