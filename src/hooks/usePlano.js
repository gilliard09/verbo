// hooks/usePlano.js
// Hook central que controla acesso por plano em todo o app.
// Uso: const { plano, isPlus, isFundador, podeCreiarSermao, totalSermoes } = usePlano();

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const LIMITE_SERMOES_GRATUITO = 50;

export function usePlano() {
  const [plano, setPlano]         = useState(null); // 'gratuito' | 'fundador' | 'plus'
  const [expira, setExpira]       = useState(null);
  const [totalSermoes, setTotal]  = useState(0);
  const [loading, setLoading]     = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPlano('gratuito'); setLoading(false); return; }

      // Busca plano e contagem de sermões em paralelo
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('profiles').select('plano, plano_expira_em').eq('id', user.id).single(),
        supabase.from('sermoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      // Plano expirado volta para gratuito automaticamente
      let planoAtivo = profile?.plano || 'gratuito';
      if (profile?.plano_expira_em && new Date(profile.plano_expira_em) < new Date()) {
        planoAtivo = 'gratuito';
        // Atualiza silenciosamente no banco
        supabase.from('profiles').update({ plano: 'gratuito', plano_expira_em: null }).eq('id', user.id);
      }

      setPlano(planoAtivo);
      setExpira(profile?.plano_expira_em || null);
      setTotal(count || 0);
    } catch (e) {
      console.error('usePlano erro:', e);
      setPlano('gratuito');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const isPlus      = plano === 'plus' || plano === 'fundador';
  const isFundador  = plano === 'fundador';
  const limiteSermoes = LIMITE_SERMOES_GRATUITO;
  const podeCreiarSermao = isPlus || totalSermoes < LIMITE_SERMOES_GRATUITO;
  const percentualUso = isPlus ? 0 : Math.min(100, Math.round((totalSermoes / LIMITE_SERMOES_GRATUITO) * 100));
  const sermoesRestantes = isPlus ? null : Math.max(0, LIMITE_SERMOES_GRATUITO - totalSermoes);

  return {
    plano,
    isPlus,
    isFundador,
    loading,
    expira,
    totalSermoes,
    limiteSermoes,
    podeCreiarSermao,
    percentualUso,
    sermoesRestantes,
    recarregar: carregar,
  };
}