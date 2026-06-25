import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Storefront from '../pages/Storefront';
import StoreNotFound from '../pages/StoreNotFound';
import { getSubdomain } from '../lib/getSubdomain';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const StoreResolver = ({ children }) => {
  const subdomain = getSubdomain();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(!!subdomain);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/store/by-subdomain/${subdomain}`);
        if (response.ok) {
          const data = await response.json();
          setStoreData(data.store);
        } else {
          setError('Store not found');
        }
      } catch (err) {
        console.error('Error fetching store data:', err);
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchStore();
    }
  }, [subdomain]);

  if (!subdomain) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-koara-blue animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Loading Store...</p>
      </div>
    );
  }

  if (error || !storeData) {
    return <StoreNotFound />;
  }

  return <Storefront store={storeData} />;
};

export default StoreResolver;
