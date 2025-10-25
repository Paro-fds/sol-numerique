import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const usePendingTransfers = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAdmin, user, isLoading: authLoading } = useAuth();

  const fetchCount = async () => {
    // ✅ Ne rien faire si pas admin ou si user n'est pas chargé
    if (!isAdmin || !user || authLoading) {
      setLoading(false);
      setCount(0);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/payments/pending-transfers');
      setCount(response.data.count || 0);
      setError(null);
    } catch (err) {
      // ✅ Les erreurs 403 sont maintenant gérées par l'intercepteur
      console.error('Error fetching pending transfers:', err);
      setError(err);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ Attendre que l'auth soit complètement chargée
    if (authLoading) {
      return;
    }

    // ✅ Ne s'exécuter que si admin
    if (!user || !isAdmin) {
      setLoading(false);
      setCount(0);
      return;
    }

    // ✅ Petit délai pour s'assurer que l'auth est stable
    const timeout = setTimeout(() => {
      fetchCount();
    }, 200);

    // ✅ Actualiser uniquement si admin
    const interval = setInterval(fetchCount, 30000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isAdmin, user, authLoading]); // ✅ Dépendances complètes

  return { count, loading, error, refresh: fetchCount };
};