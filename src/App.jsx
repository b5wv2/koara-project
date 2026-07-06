import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/Landing';
import AdminDashboard from './pages/Admin';
import Storefront from './pages/Storefront';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Terms from './pages/Terms';
import StoreResolver from './components/StoreResolver';
import { getSubdomain } from './lib/getSubdomain';
import CookieConsentBanner from './components/CookieConsentBanner';

function App() {
  return (
    <AppProvider>
      <StoreResolver>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
          <CookieConsentBanner />
        </Router>
      </StoreResolver>
    </AppProvider>
  );
}

export default App;
