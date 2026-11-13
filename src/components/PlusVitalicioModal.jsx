import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ShieldCheck, GraduationCap, CalendarCheck } from 'lucide-react';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';

// Controle manual da campanha: altere para false para interromper a exibição.
const CAMPANHA_VITALICIO_ATIVA = true;
const CHECKOUT_ANUAL = 'https://pay.cakto.com.br/s9tdarf_1199602';
const CHECKOUT_VITALICIO = 'https://pay.cakto.com.br/zeegt89_920646';
const CHECKOUT_MENSAL = 'https://pay.cakto.com.br/ykwdiud_920168';
const STORAGE_KEY = 'verbo-black-friday-2026';
const DURACAO_CAMPANHA_MS = 10 * 24 * 60 * 60 * 1000;
const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;

const PlusVitalicioModal = ({ session, outroModalAberto = false }) => {
  const { plano, loading } = usePlano();
  const [aberto, setAberto] = useState(false);
  const [ofertaMensalAberta, setOfertaMensalAberta] = useState(false);

  // Todos os eventos do pop-up ficam associados ao usuário e à variante da oferta.
  const registrarEvento = (acao) => {
    const userId = session?.user?.id;
    if (!userId) return;
    supabase.from('eventos_modal_upgrade')
      .insert({ user_id: userId, acao, variante: 'black_friday_2026' })
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

        // A campanha de cada usuário dura 10 dias desde a primeira exibição.
        if (estadoSalvo?.inicio && agora - estadoSalvo.inicio >= DURACAO_CAMPANHA_MS) {
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

  // A oferta mensal só aparece após a recusa explícita da Black Friday e
  // apenas uma vez por usuário. Fechar no X ou clicar fora não a dispara.
  const recusarBlackFriday = () => {
    registrarEvento('recusou_black_abriu_mensal');
    setAberto(false);
    try {
      const chaveUsuario = `${STORAGE_KEY}-${session.user.id}`;
      const estadoSalvo = JSON.parse(localStorage.getItem(chaveUsuario) || 'null') || {};
      if (estadoSalvo.ofertaMensalExibida) return;
      localStorage.setItem(chaveUsuario, JSON.stringify({ ...estadoSalvo, ofertaMensalExibida: true }));
    } catch (error) {
      console.warn('Não foi possível salvar a exibição da oferta mensal:', error);
    }
    setOfertaMensalAberta(true);
    registrarEvento('oferta_mensal_exibida');
  };

  const fecharOfertaMensal = () => {
    registrarEvento('dispensou_oferta_mensal');
    setOfertaMensalAberta(false);
  };

  const abrirCheckoutMensal = () => {
    registrarEvento('clicou_mensal');
    window.open(CHECKOUT_MENSAL, '_blank', 'noopener,noreferrer');
    setOfertaMensalAberta(false);
  };

  const abrirCheckout = (tipo) => {
    registrarEvento(`clicou_${tipo}`);
    const checkout = tipo === 'anual' ? CHECKOUT_ANUAL : CHECKOUT_VITALICIO;
    window.open(checkout, '_blank', 'noopener,noreferrer');
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

  const beneficios = [
    'Sermões ilimitados no editor',
    'Formatação e salvamento automático',
    'Modo Púlpito com leitura em tela cheia e ajuste de fonte',
    'Bíblia integrada ao editor',
    'Organização dos sermões e histórico de versões',
    'Acesso offline aos sermões salvos',
    'Devocionais e recursos do plano Plus',
    'Acesso a todos os cursos disponíveis na Academia Verbo',
    'Acesso aos recursos e atualizações futuras do Plus enquanto a plataforma estiver ativa',
  ];

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

        <div className="bg-gradient-to-br from-[#6D28D9] via-[#5B2DFF] to-[#3A1DB8] px-5 pb-4 pt-5 text-center sm:px-6">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
            <Zap size={21} fill="currentColor" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100">
            BLACK FRIDAY · CONDIÇÃO ESPECIAL
          </p>
          <h2 id="plus-vitalicio-title" className="mt-1.5 text-xl font-black leading-tight tracking-tight sm:text-2xl">
            Verbo PLUS<br />Black Friday
          </h2>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-violet-100 sm:text-sm">
            Escolha o acesso que faz mais sentido para sua jornada. Mais tempo para preparar sermões e crescer no conhecimento bíblico.
          </p>
        </div>

        <div className="px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-violet-200">Plus anual</p>
              <p className="mt-1 text-2xl font-black">R$ 197</p>
              <p className="mt-1 text-[10px] text-violet-200/80">12 meses · R$ 16,42/mês</p>
              <button type="button" onClick={() => abrirCheckout('anual')} className="mt-3 w-full rounded-lg bg-violet-300 px-2 py-2 text-[10px] font-black text-[#24133F] transition hover:bg-white">ASSINAR ANUAL</button>
            </div>
            <div className="rounded-xl border border-amber-300/40 bg-amber-300/[0.10] p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">Plus vitalício</p>
              <p className="mt-1 text-2xl font-black">R$ 297</p>
              <p className="mt-1 text-[10px] text-violet-100/80">Pagamento único</p>
              <button type="button" onClick={() => abrirCheckout('vitalicio')} className="mt-3 w-full rounded-lg bg-white px-2 py-2 text-[10px] font-black text-[#4C1D95] transition hover:bg-violet-50">QUERO VITALÍCIO</button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-violet-200/80">No anual, você economiza R$ 367 em relação a 12 mensalidades de R$ 47.</p>

          <div className="my-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={17} className="shrink-0 text-violet-300" />
              <p className="text-xs font-bold text-white">Tudo do Plus para preparar suas mensagens</p>
            </div>
            <ul className="space-y-1.5">
              {beneficios.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-snug text-violet-50/90">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-violet-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="my-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] p-3">
            <div className="mb-2 flex items-center gap-2">
              <GraduationCap size={18} className="shrink-0 text-violet-300" />
              <p className="text-xs font-bold text-white">Formação teológica inclusa</p>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-violet-100/85">
              Não prepare apenas sermões. Continue crescendo na Palavra com a Academia Verbo.
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-bold text-white">Teologia Fundamental</p>
                <p className="text-[11px] leading-relaxed text-violet-200/80">Uma base organizada para aprofundar os fundamentos da fé cristã.</p>
              </div>
              <div>
                <p className="text-xs font-bold text-white">Método Pregação Impactante (MPI)</p>
                <p className="text-[11px] leading-relaxed text-violet-200/80">Aprenda a desenvolver e comunicar mensagens bíblicas com mais clareza.</p>
              </div>
            </div>
            <p className="mt-2 rounded-lg bg-white/[0.05] px-2.5 py-2 text-[11px] font-semibold text-violet-100">
              Certificados inclusos nos cursos que oferecem certificação.
            </p>
          </div>

          <p className="mt-2 text-center text-[10px] leading-relaxed text-violet-200/75">
            Anual: R$ 197 por 12 meses. Vitalício: R$ 297 em pagamento único, sem renovação.
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
