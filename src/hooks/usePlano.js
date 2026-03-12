// hooks/usePlano.js
// Hook central que controla acesso por plano em todo o app.
// Uso: const { plano, isPlus, isFundador, temAcessoCurso, podeCreiarSermao } = usePlano();

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const LIMITE_SERMOES_GRATUITO = 50;

export function usePlano() {
  const [plano, setPlano]        = useState(null); // 'gratuito' | 'fundador' | 'plus'
  const [expira, setExpira]      = useState(null);
  const [totalSermoes, setTotal] = useState(0);
  const [loading, setLoading]    = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPlano('gratuito'); setLoading(false); return; }

      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('profiles').select('plano, plano_expira_em').eq('id', user.id).single(),
        supabase.from('sermoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      let planoAtivo = profile?.plano || 'gratuito';
      if (profile?.plano_expira_em && new Date(profile.plano_expira_em) < new Date()) {
        planoAtivo = 'gratuito';
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

  const isFundador = plano === 'fundador';
  const isPlus     = plano === 'plus';
  const isAssinante = isFundador || isPlus; // qualquer plano pago

  // Verifica se o plano do usuário dá acesso a um curso específico
  // curso.plano_minimo: 'fundador' | 'plus' | null (livre para todos os assinantes)
  const temAcessoCurso = (curso) => {
    if (!curso) return false;
    if (isPlus) return true; // plus acessa tudo
    if (isFundador) return !curso.plano_minimo || curso.plano_minimo === 'fundador';
    return false; // gratuito não acessa nenhum curso
  };

  const limiteSermoes    = LIMITE_SERMOES_GRATUITO;
  const podeCreiarSermao = isAssinante || totalSermoes < LIMITE_SERMOES_GRATUITO;
  const percentualUso    = isAssinante ? 0 : Math.min(100, Math.round((totalSermoes / LIMITE_SERMOES_GRATUITO) * 100));
  const sermoesRestantes = isAssinante ? null : Math.max(0, LIMITE_SERMOES_GRATUITO - totalSermoes);

  return {
    plano,
    isPlus,
    isFundador,
    isAssinante,
    temAcessoCurso,
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