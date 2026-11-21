// hooks/usePlano.js
// Hook central que controla acesso por plano em todo o app.
// Uso: const { plano, isPlus, isFundador, isAssinante, temAcessoCurso, podeCreiarSermao } = usePlano();
//
// Planos atuais: Gratuito (3 sermões), Essencial (20) e Plus (ilimitado).
// O identificador `fundador` é mantido apenas para compatibilidade com contas antigas.
// Use `isAssinante` para verificar qualquer plano pago e `isPlus` apenas para o Plus.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const LIMITE_SERMOES_GRATUITO = 3;
const LIMITE_SERMOES_ESSENCIAL = 20;

export function usePlano() {
  const [plano, setPlano]        = useState(null); // 'gratuito' | 'essencial' | 'plus' (fundador legado)
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

  const isFundador  = plano === 'fundador'; // compatibilidade com contas antigas
  const isEssencial = plano === 'essencial' || isFundador;
  const isPlus      = plano === 'plus';
  const isAssinante = isEssencial || isPlus;

  // Verifica se o plano do usuário dá acesso a um curso específico
  // curso.plano_minimo: 'essencial' | 'fundador' (legado) | 'plus' | null
  const temAcessoCurso = (curso) => {
    if (!curso) return false;
    if (isPlus) return true; // plus acessa tudo
    if (isEssencial) return !curso.plano_minimo || ['essencial', 'fundador'].includes(curso.plano_minimo);
    return false; // gratuito não acessa nenhum curso
  };

  const limiteSermoes = isPlus ? null : isEssencial ? LIMITE_SERMOES_ESSENCIAL : LIMITE_SERMOES_GRATUITO;
  const podeCreiarSermao = isPlus || totalSermoes < limiteSermoes;
  const percentualUso = isPlus ? 0 : Math.min(100, Math.round((totalSermoes / limiteSermoes) * 100));
  const sermoesRestantes = isPlus ? null : Math.max(0, limiteSermoes - totalSermoes);

  return {
    plano,
    isPlus,
    isFundador,
    isEssencial,
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