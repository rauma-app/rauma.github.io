import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { d1Api } from '../lib/d1Api';

const PremiumContext = createContext({
  premiumMap: {},
  perumahanAdminMap: {},
  loading: true,
  refresh: () => {},
});

export function PremiumProvider({ children }) {
  const [premiumMap, setPremiumMap] = useState({}); // { [uid]: label }
  const [perumahanAdminMap, setPerumahanAdminMap] = useState({}); // { [uid]: label }
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [premiumList, perumahanAdminList] = await Promise.all([
        d1Api.getPremiumAccounts(),
        d1Api.getPerumahanAdmins(),
      ]);

      const pMap = {};
      (premiumList || []).forEach((item) => {
        pMap[item.uid] = item.label || '';
      });
      setPremiumMap(pMap);

      const paMap = {};
      (perumahanAdminList || []).forEach((item) => {
        paMap[item.uid] = item.label || '';
      });
      setPerumahanAdminMap(paMap);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PremiumContext.Provider value={{ premiumMap, perumahanAdminMap, loading, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
