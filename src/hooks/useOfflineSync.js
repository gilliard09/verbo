/**
 * useOfflineSync.js — Hook central de offline/sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { processarFila, downloadSermoes } from '../lib/sync';
import { countQueue } from '../lib/db';
import { supabase } from '../supabaseClient';

export function useOfflineSync() {
  const [isOnline, setIsOnline]     = useState(navigator.onLine);
  const [pendingCount, setPending]  = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  const userIdRef                   = useRef(null);
  const syncingRef                  = useRef(false);

  const atualizarPendentes = useCallback(async () => {
    const n = await countQueue();
    setPending(n);
  }, []);

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const { sincronizados } = await processarFila();
      if (userIdRef.current) await downloadSermoes(userIdRef.current);
      await atualizarPendentes();
      setSyncStatus(sincronizados > 0 ? 'done' : 'idle');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.warn('[Sync] erro:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      syncingRef.current = false;
    }
  }, [atualizarPendentes]);

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  sincronizar(); };
    const handleOffline = () =>   setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sincronizar]);

  useEffect(() => {
    const init = async () => {
      await atualizarPendentes();
      if (!navigator.onLine) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      userIdRef.current = session.user.id;
      await sincronizar();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pendingCount, syncStatus, sincronizar, atualizarPendentes };
}