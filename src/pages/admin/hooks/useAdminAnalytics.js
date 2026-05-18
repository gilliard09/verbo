import { useCallback, useEffect, useState } from 'react';
import { fetchAdminCounts } from '../services/adminAnalytics.service';

export const useAdminAnalytics = () => {
  const [stats, setStats] = useState({ totalUsuarios: 0, totalSermoes: 0, totalAssinaturas: 0 });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const carregarAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await fetchAdminCounts();
      setStats(data);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    carregarAnalytics();
  }, [carregarAnalytics]);

  return { stats, loadingAnalytics, carregarAnalytics };
};
