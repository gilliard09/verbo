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
    if (!userIdRef.current) {
      setPending(0);
      return;
    }
    const n = await countQueue(userIdRef.current);
    setPending(n);
  }, []);

  const sincronizar = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userIdRef.current = session.user.id;
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

  // Mantém a fila visível vinculada à sessão atual, inclusive quando
  // o usuário troca de conta sem fechar a aplicação.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      userIdRef.current = userId;

      if (!userId) {
        setPending(0);
        return;
      }

      countQueue(userId)
        .then(setPending)
        .catch(err => console.warn('[Sync] Não foi possível atualizar pendências:', err));
    });

    return () => subscription.unsubscribe();
  }, []);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) userIdRef.current = session.user.id;
      await atualizarPendentes();
      if (!navigator.onLine || !session?.user) return;
      await sincronizar();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pendingCount, syncStatus, sincronizar, atualizarPendentes };
}