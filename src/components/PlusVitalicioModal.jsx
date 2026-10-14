import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { usePlano } from '../hooks/usePlano';

// Controle manual da campanha: altere para false para interromper a exibição.
const CAMPANHA_VITALICIO_ATIVA = true;
const CHECKOUT_VITALICIO = 'https://pay.cakto.com.br/zeegt89_920646';
const STORAGE_KEY = 'verbo-plus-vitalicio-campanha';
const DURACAO_CAMPANHA_MS = 10 * 24 * 60 * 60 * 1000;
const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;

const PlusVitalicioModal = ({ session, outroModalAberto = false }) => {
  const { plano, loading } = usePlano();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!CAMPANHA_VITALICIO_ATIVA || !session?.user?.id || loading || outroModalAberto) {
      setAberto(false);
      return undefined;
    }

    // A oferta é apenas para usuários Gratuito e Essencial/Fundador.
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
          return;
        }

        if (!estadoSalvo.ultimaExibicao || agora - estadoSalvo.ultimaExibicao >= INTERVALO_DIARIO_MS) {
          localStorage.setItem(chaveUsuario, JSON.stringify({
            ...estadoSalvo,
            ultimaExibicao: agora,
          }));
          setAberto(true);
        } else {
          setAberto(false);
        }
      } catch {
        setAberto(true);
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

  const fechar = () => setAberto(false);

  const abrirCheckout = () => {
    window.open(CHECKOUT_VITALICIO, '_blank', 'noopener,noreferrer');
  };

  if (!aberto || loading || !session?.user?.id || outroModalAberto) return null;

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
      <div className="relative my-auto max-h-[calc(100dvh-24px)] w-full max-w-[360px] overflow-y-auto rounded-[22px] border border-white/10 bg-[#171123] text-white shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-40px)] sm:max-w-sm">
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
            Oferta especial para usuários Verbo
          </p>
          <h2 id="plus-vitalicio-title" className="mt-1.5 text-xl font-black leading-tight tracking-tight sm:text-2xl">
            Verbo PLUS<br />Vitalício
          </h2>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-violet-100 sm:text-sm">
            Todos os recursos do PLUS com um único pagamento. Sem mensalidade.
          </p>
        </div>

        <div className="px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
          <div className="flex items-center justify-center gap-2 text-sm text-violet-200/80">
            <span className="text-base line-through decoration-violet-300/70">R$ 47/mês</span>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Pagamento único
            </span>
          </div>

          <div className="mt-1 text-center">
            <span className="text-3xl font-black tracking-tight">R$ 97</span>
            <p className="mt-1 text-xs text-violet-200/75">Acesso vitalício aos recursos do PLUS incluídos nesta oferta</p>
          </div>

          <div className="my-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-300" />
              <p className="text-xs font-bold text-white">O que está incluído</p>
            </div>
            <ul className="space-y-1.5">
              {[
                'Sermões ilimitados',
                'Acesso completo à Academia Verbo',
                'Modo Púlpito e recursos avançados',
                'Acesso offline ilimitado aos sermões',
                'Atualizações futuras do Verbo',
                'Suporte prioritário',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-snug text-violet-50/90">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-3 text-center">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />
            <p className="text-xs font-semibold text-amber-100">
              Condição especial anunciada para apenas 20 vagas
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black sm:text-sm text-[#4C1D95] shadow-lg shadow-black/10 transition hover:bg-violet-50 active:scale-[0.99]"
          >
            QUERO MEU PLUS VITALÍCIO
            <ArrowUpRight size={18} />
          </button>

          <button
            type="button"
            onClick={fechar}
            className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-violet-200/70 transition hover:text-white"
          >
            Agora não, continuar usando o Verbo
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
