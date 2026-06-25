import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/Landing';
import AdminDashboard from './pages/Admin';
import Storefront from './pages/Storefront';
import StoreResolver from './components/StoreResolver';
import { getSubdomain } from './lib/getSubdomain';

function App() {
  return (
    <AppProvider>
      <StoreResolver>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Router>
      </StoreResolver>
    </AppProvider>
  );
}

export default App;
