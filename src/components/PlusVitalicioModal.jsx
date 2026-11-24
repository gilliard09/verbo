import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ShieldCheck, GraduationCap, CalendarCheck, Clock3, Hourglass } from 'lucide-react';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';
import { CHECKOUT_PLUS } from '../constants/checkout';

// Campanha temporária: BLACK DAS BLACKS, válida até 30/11/2026.
const CAMPANHA_VITALICIO_ATIVA = true;
const CHECKOUT_VITALICIO = 'https://pay.cakto.com.br/mf6mvvs';
const STORAGE_KEY = 'verbo-black-das-blacks-2026';
const FIM_CAMPANHA = new Date('2026-12-01T00:00:00-03:00').getTime();
const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;

const calcularTempoRestante = () => {
  const diferenca = Math.max(0, FIM_CAMPANHA - Date.now());
  return {
    dias: Math.floor(diferenca / 86400000),
    horas: Math.floor((diferenca % 86400000) / 3600000),
    minutos: Math.floor((diferenca % 3600000) / 60000),
    segundos: Math.floor((diferenca % 60000) / 1000),
    encerrada: diferenca <= 0,
  };
};

const PlusVitalicioModal = ({ session, outroModalAberto = false }) => {
  const { plano, loading } = usePlano();
  const [aberto, setAberto] = useState(false);
  const [ofertaMensalAberta, setOfertaMensalAberta] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(calcularTempoRestante);

  // Contagem regressiva baseada no horário real de encerramento da campanha.
  useEffect(() => {
    const atualizar = () => setTempoRestante(calcularTempoRestante());
    atualizar();
    const intervalo = window.setInterval(atualizar, 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  // Todos os eventos do pop-up ficam associados ao usuário e à variante da oferta.
  const registrarEvento = (acao) => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase.from('eventos_modal_upgrade')
      .insert({ user_id: userId, acao, variante: 'black_das_blacks_2026' })
      .then(({ error }) => {
        if (error) console.warn('Não foi possível registrar evento do Vitalício:', error.message);
      });
  };

  useEffect(() => {
    if (!CAMPANHA_VITALICIO_ATIVA || !session?.user?.id || loading || outroModalAberto) {
      setAberto(false);
      return undefined;
    }

    // A oferta é apenas para usuários Gratuito e Fundador.
    if (plano !== 'gratuito' && plano !== 'fundador') {
      setAberto(false);
      return undefined;
    }

    let cancelado = false;
    const mostrarSeElegivel = () => {
      try {
        const agora = Date.now();
        const chaveUsuario = `${STORAGE_KEY}-${session.user.id}`;
        const estadoSalvo = JSON.parse(localStorage.getItem(chaveUsuario) || 'null');

        // A campanha termina para todos em 30/11/2026, independentemente da primeira exibição.
        if (agora >= FIM_CAMPANHA) {
          setAberto(false);
          return;
        }

        // Exibe no máximo uma vez por dia, mesmo se o usuário fechar e navegar.
        if (!estadoSalvo) {
          localStorage.setItem(chaveUsuario, JSON.stringify({ inicio: agora, ultimaExibicao: agora }));
          setAberto(true);
          registrarEvento('exibido');
          return;
        }

        if (!estadoSalvo.ultimaExibicao || agora - estadoSalvo.ultimaExibicao >= INTERVALO_DIARIO_MS) {
          localStorage.setItem(chaveUsuario, JSON.stringify({
            ...estadoSalvo,
            ultimaExibicao: agora,
          }));
          setAberto(true);
          registrarEvento('exibido');
        } else {
          setAberto(false);
        }
      } catch {
        setAberto(true);
        registrarEvento('exibido');
      }
    };

    const timer = window.setTimeout(() => {
      if (!cancelado) mostrarSeElegivel();
    }, 10000);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [session?.user?.id, plano, loading, outroModalAberto]);

  const fechar = () => {
    registrarEvento('dispensou');
    setAberto(false);
  };

  // Ao recusar o vitalício, apresenta imediatamente a alternativa mensal de R$ 47.
  const recusarBlackFriday = () => {
    registrarEvento('dispensou');
    setAberto(false);
    setOfertaMensalAberta(true);
  };

  const abrirCheckoutMensal = () => {
    registrarEvento('clicou_plus');
    if (!CHECKOUT_PLUS) {
      console.error('Checkout do Plus não configurado. Verifique VITE_CHECKOUT_PLUS.');
      return;
    }
    window.open(CHECKOUT_PLUS, '_blank', 'noopener,noreferrer');
  };

  const fecharOfertaMensal = () => {
    registrarEvento('dispensou_oferta_mensal');
    setOfertaMensalAberta(false);
  };

  const abrirCheckout = () => {
    if (calcularTempoRestante().encerrada) return;
    registrarEvento('clicou_vitalicio');
    window.open(CHECKOUT_VITALICIO, '_blank', 'noopener,noreferrer');
  };

  if (loading || !session?.user?.id || outroModalAberto) return null;

  if (ofertaMensalAberta) {
    return (
      <div className="fixed inset-0 z-[251] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-4" role="dialog" aria-modal="true" aria-labelledby="plus-mensal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) fecharOfertaMensal(); }}>
        <div className="relative my-auto w-full max-w-[390px] rounded-[22px] border border-white/10 bg-[#171123] p-5 text-white shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-200 sm:p-6">
          <button type="button" onClick={fecharOfertaMensal} aria-label="Fechar oferta" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"><X size={18} /></button>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><CalendarCheck size={22} /></div>
          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">UMA ALTERNATIVA PARA COMEÇAR</p>
          <h2 id="plus-mensal-title" className="mt-2 text-center text-2xl font-black leading-tight">Comece pelo Verbo Plus</h2>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-violet-100/80">Você não precisa contratar um plano anual para aproveitar todos os recursos do Verbo.</p>
          <div className="my-5 rounded-2xl border border-violet-300/20 bg-white/[0.05] px-4 py-4 text-center">
            <p className="text-4xl font-black tracking-tight">R$ 47<span className="text-lg font-bold text-violet-200">/mês</span></p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">Cancele quando quiser</p>
          </div>
          <ul className="mb-5 space-y-2.5">
            {['Todos os recursos do Plus', 'Todos os cursos da Academia Verbo', 'Sermões ilimitados', 'Importação de sermões em PDF e DOCX', 'Acesso às novas funcionalidades do Plus'].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-snug text-violet-50/90"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" /><span>{item}</span></li>
            ))}
          </ul>
          <button type="button" onClick={abrirCheckoutMensal} className="w-full rounded-xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-[#10251D] transition hover:bg-emerald-300">QUERO ASSINAR O PLUS</button>
          <button type="button" onClick={fecharOfertaMensal} className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-violet-200/70 transition hover:text-white">Não quero continuar agora</button>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-violet-200/45">Assinatura mensal de R$ 47. Você será direcionado ao checkout seguro da Cakto.</p>
        </div>
      </div>
    );
  }

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-slate-950/65 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plus-vitalicio-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) fechar();
      }}
    >
      <div className="relative my-auto max-h-[calc(100dvh-24px)] w-full max-w-[390px] overflow-y-auto rounded-[22px] border border-white/10 bg-[#171123] text-white shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-40px)] sm:max-w-md">
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar oferta"
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 transition hover:bg-black/35 hover:text-white"
        >
          <X size={19} />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-[#171D12] via-[#11140F] to-[#090B08] px-5 pb-4 pt-5 text-center sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-400/10 text-orange-300 shadow-lg">
            <Hourglass size={22} />
          </div>
          <p className="relative text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">
            BLACK FRIDAY VERBO · ÚLTIMA SEMANA
          </p>
          <h2 id="plus-vitalicio-title" className="relative mt-1.5 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            A ÚLTIMA CHANCE<br /><span className="text-orange-400">É AGORA.</span>
          </h2>
          <p className="relative mx-auto mt-2 max-w-xs text-xs leading-relaxed text-white/75 sm:text-sm">
            O acesso Plus Vitalício por R$ 97 termina em 30 de novembro.
          </p>
          <div className="relative mt-4 rounded-xl border border-orange-400/30 bg-black/35 px-3 py-3">
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-200">
              <Clock3 size={13} /> A oferta termina em 30/11/2026 às 23h59
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                ['dias', tempoRestante.dias],
                ['horas', tempoRestante.horas],
                ['min', tempoRestante.minutos],
                ['seg', tempoRestante.segundos],
              ].map(([label, valor]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.06] py-1.5">
                  <p className="text-xl font-black tabular-nums text-white sm:text-2xl">{String(valor).padStart(2, '0')}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/55">{label}</p>
                </div>
              ))}
            </div>
            {tempoRestante.encerrada && <p className="mt-2 text-xs font-bold text-orange-300">A campanha foi encerrada.</p>}
          </div>
        </div>

        <div className="px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
          <div className="rounded-2xl border border-orange-400/45 bg-gradient-to-br from-orange-400/10 to-amber-300/[0.06] p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">PLANO PLUS VITALÍCIO</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-sm font-bold text-white/55 line-through">R$ 297</span>
              <span className="rounded-full bg-orange-400 px-2 py-0.5 text-[9px] font-black uppercase text-[#17120A]">Oferta final</span>
            </div>
            <p className="mt-1 text-5xl font-black tracking-tight text-orange-400">R$ 97</p>
            <p className="mt-1 text-xs font-semibold text-white/75">Pagamento único · Sem mensalidade</p>
            <button type="button" disabled={tempoRestante.encerrada} onClick={abrirCheckout} className="mt-3 w-full rounded-xl bg-orange-500 px-3 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">
              {tempoRestante.encerrada ? 'OFERTA ENCERRADA' : 'GARANTIR MEU PLUS VITALÍCIO — R$ 97'}
            </button>
            <p className="mt-2 text-[10px] font-semibold text-white/55">Válido até 30/11/2026 às 23h59 (horário de Brasília).</p>
          </div>

          <div className="my-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-orange-300" />
              <p className="text-xs font-bold text-white">Tudo o que você precisa em uma só plataforma</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-semibold leading-relaxed text-white/85 sm:text-[11px]">
              {['Sermões ilimitados', 'Modo Púlpito', 'Bíblia integrada', 'Acesso offline', 'Salvamento automático', 'Recursos Plus'].map((item, index) => (
                <React.Fragment key={item}>
                  {index > 0 && <span className="text-orange-400">•</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="my-3 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <GraduationCap size={18} className="shrink-0 text-orange-300" />
              <p className="text-xs font-bold text-white">E ainda: Academia Verbo inclusa</p>
            </div>
            <p className="mb-2 text-[11px] leading-relaxed text-white/65">
              Formação bíblica e prática para crescer no conhecimento e no ministério.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Novo Testamento Explicado', 'Fundamentos da Pregação Cristã', 'Líder 5.0', 'Discipulado Cristão', 'Teologia Fundamental', 'Método Pregação Impactante'].map((curso) => (
                <span key={curso} className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] font-semibold leading-tight text-orange-100">{curso}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-medium text-white/55">Acesso aos cursos disponíveis na Academia Verbo e aos que forem incluídos no benefício.</p>
          </div>

          <p className="mt-2 text-center text-[10px] leading-relaxed text-violet-200/75">
            Acesso vitalício por R$ 97 em pagamento único. Contagem regressiva até 30/11/2026 às 23h59.
          </p>

          <button
            type="button"
            onClick={recusarBlackFriday}
            className="mt-1 w-full rounded-xl px-4 py-2 text-xs font-semibold text-violet-200/70 transition hover:text-white"
          >
            Não quero essa oportunidade
          </button>

          <p className="mt-1 text-center text-[9px] leading-relaxed text-violet-200/45">
            Você será direcionado ao checkout seguro da Cakto. Confira as condições completas antes de finalizar a compra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlusVitalicioModal;
