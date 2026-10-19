import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { d1Api } from '../lib/d1Api';

const PremiumContext = createContext({
  premiumMap: {},
  loading: true,
  refresh: () => {},
});

export function PremiumProvider({ children }) {
  const [premiumMap, setPremiumMap] = useState({}); // { [uid]: label }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const premiumList = await d1Api.getPremiumAccounts();

      const pMap = {};
      (premiumList || []).forEach((item) => {
        pMap[item.uid] = item.label || '';
      });
      setPremiumMap(pMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PremiumContext.Provider value={{ premiumMap, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
