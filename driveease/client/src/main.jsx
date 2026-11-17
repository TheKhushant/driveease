import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { SiteProvider } from './context/SiteContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '14px', fontSize: '14px', fontWeight: 500 },
            }}
          />
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
