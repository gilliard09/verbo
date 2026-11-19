// Hook central de acesso aos planos do Verbo.
// A definição oficial de cada plano fica em src/lib/planos.js.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  obterConfiguracaoPlano,
  normalizarPlano,
  temAcessoAoCurso as verificarAcessoAoCurso,
} from '../lib/planos';

export function usePlano() {
  const [plano, setPlano] = useState('gratuito');
  const [expira, setExpira] = useState(null);
  const [totalSermoes, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: erroUsuario } = await supabase.auth.getUser();
      if (erroUsuario) throw erroUsuario;

      if (!user) {
        setPlano('gratuito');
        setExpira(null);
        setTotal(0);
        return;
      }

      const [{ data: profile, error: erroPerfil }, { count, error: erroContagem }] = await Promise.all([
        supabase.from('profiles')
          .select('plano, plano_expira_em')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.from('sermoes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (erroPerfil) throw erroPerfil;
      if (erroContagem) throw erroContagem;

      let planoAtivo = normalizarPlano(profile?.plano);
      let dataExpiracao = profile?.plano_expira_em || null;

      if (dataExpiracao && new Date(dataExpiracao).getTime() <= Date.now()) {
        planoAtivo = 'gratuito';
        dataExpiracao = null;

        const { error: erroAtualizacao } = await supabase
          .from('profiles')
          .update({ plano: 'gratuito', plano_expira_em: null })
          .eq('id', user.id);

        if (erroAtualizacao) {
          console.error('usePlano: não foi possível registrar a expiração do plano:', erroAtualizacao);
        }
      }

      setPlano(planoAtivo);
      setExpira(dataExpiracao);
      setTotal(count || 0);
    } catch (e) {
      console.error('usePlano erro:', e);
      setPlano('gratuito');
      setExpira(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const config = obterConfiguracaoPlano(plano);
  const isFundador = plano === 'fundador';
  const isEssencial = config.nivel === 'essencial';
  const isPlus = config.nivel === 'plus';
  const isAssinante = config.pago;

  const temAcessoCurso = (curso) => verificarAcessoAoCurso(plano, curso);

  const limiteSermoes = config.limiteSermoes;
  const podeCreiarSermao = limiteSermoes === null || totalSermoes < limiteSermoes;
  const percentualUso = limiteSermoes === null
    ? 0
    : Math.min(100, Math.round((totalSermoes / limiteSermoes) * 100));
  const sermoesRestantes = limiteSermoes === null
    ? null
    : Math.max(0, limiteSermoes - totalSermoes);

  return {
    plano,
    isPlus,
    isFundador,
    isFundadorLegado: isFundador,
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
