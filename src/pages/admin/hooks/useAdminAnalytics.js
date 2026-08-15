import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

// Versão corrigida e autocontida: o arquivo original estava com dois hooks
// colados por engano (useAdminDashboardState dentro do corpo deste), sem
// `return` final e sem fechar chaves corretamente — por isso não rodava.
//
// Também não depende mais de '../services/adminAnalytics.service' (arquivo
// que não existe no seu projeto até onde vimos) — as queries ficam aqui
// direto, usando os mesmos nomes de tabela/coluna confirmados no
// AdminDashboard.jsx real (profiles.plano, sermoes.user_id, etc).
//
// DAU/WAU e "retornou em 7 dias" vêm da função admin_metricas_sessao()
// (ver migration_admin_metricas_sessao.sql) em vez da tabela `sessoes`,
// que nunca recebe insert em nenhum lugar do app hoje.

const ESTADO_INICIAL = {
  totalUsuarios: 0,
  totalSermoes: 0,
  totalAssinaturas: 0,
  funil: { visitantes: null, cadastros: 0, usaram: 0, voltaram: 0, assinaram: 0 },
  taxas: { visitanteCadastro: null, cadastroUso: 0, usoAssinatura: 0 },
  ativacao: { pct1Sermao: 0, pct3Sermoes: 0, pct7Dias: 0 },
  retencao: { dau: 0, wau: 0 },
};

export const useAdminAnalytics = () => {
  const [stats, setStats] = useState(ESTADO_INICIAL);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [erroAnalytics, setErroAnalytics] = useState(null);

  const carregarAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setErroAnalytics(null);
    try {
      const [
        { count: totalUsuarios },
        { count: totalSermoes },
        { count: totalAssinaturas },
        vercelRes,
        metricasSessaoRes,
        { data: todosSermoes },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('sermoes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).in('plano', ['fundador', 'plus']),
        supabase.functions.invoke('vercel-analytics').catch(() => ({ data: null })),
        supabase.rpc('admin_metricas_sessao').catch(() => ({ data: null })),
        supabase.from('sermoes').select('user_id'),
      ]);

      // Distribuição de sermões por usuário — base do funil de ativação.
      const contagemPorUser = {};
      (todosSermoes || []).forEach(s => {
        contagemPorUser[s.user_id] = (contagemPorUser[s.user_id] || 0) + 1;
      });
      const com1Sermao = Object.keys(contagemPorUser).length;
      const com3Sermoes = Object.values(contagemPorUser).filter(v => v >= 3).length;
      const com2Mais = Object.values(contagemPorUser).filter(v => v >= 2).length;

      const metricasSessao = metricasSessaoRes?.data || {};
      const dau = metricasSessao.dau ?? 0;
      const wau = metricasSessao.wau ?? 0;
      const retornou7d = metricasSessao.retornou_7d ?? 0;

      const totalVisitantesVercel = vercelRes?.data?.totalVisitantes || 0;
      const visitantesDisponiveis = totalVisitantesVercel > 0;
      // Sem fallback fabricado: se o Vercel não responder, mostramos "sem
      // dado" (null) em vez de inventar um número — evita que a taxa
      // "Visitante → Cadastro" pareça real quando na verdade é um chute.
      const totalVisitantes = visitantesDisponiveis ? totalVisitantesVercel : null;

      setStats({
        totalUsuarios: totalUsuarios ?? 0,
        totalSermoes: totalSermoes ?? 0,
        totalAssinaturas: totalAssinaturas ?? 0,
        funil: {
          visitantes: totalVisitantes,
          cadastros: totalUsuarios ?? 0,
          usaram: com1Sermao,
          voltaram: com2Mais,
          assinaram: totalAssinaturas ?? 0,
        },
        taxas: {
          visitanteCadastro: visitantesDisponiveis && totalVisitantes > 0
            ? Math.round((totalUsuarios / totalVisitantes) * 100)
            : null,
          cadastroUso: totalUsuarios > 0 ? Math.round((com1Sermao / totalUsuarios) * 100) : 0,
          usoAssinatura: com1Sermao > 0 ? Math.round((totalAssinaturas / com1Sermao) * 100) : 0,
        },
        ativacao: {
          pct1Sermao: totalUsuarios > 0 ? Math.round((com1Sermao / totalUsuarios) * 100) : 0,
          pct3Sermoes: totalUsuarios > 0 ? Math.round((com3Sermoes / totalUsuarios) * 100) : 0,
          // Agora é retorno real em 7 dias (login via auth.users), não mais
          // "criou 2+ sermões alguma vez" disfarçado de janela de tempo.
          pct7Dias: totalUsuarios > 0 ? Math.round((retornou7d / totalUsuarios) * 100) : 0,
        },
        retencao: { dau, wau },
      });
    } catch (err) {
      console.error('Erro ao carregar analytics administrativo:', err);
      setErroAnalytics('Não foi possível carregar as métricas agora.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    carregarAnalytics();
  }, [carregarAnalytics]);

  return { stats, loadingAnalytics, erroAnalytics, carregarAnalytics };
};