import React, { useEffect, useState } from 'react';
import { X, Zap, CheckCircle2, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { usePlano } from '../hooks/usePlano';

// Controle manual da campanha: altere para false para interromper a exibição.
const CAMPANHA_VITALICIO_ATIVA = true;
const CHECKOUT_VITALICIO = 'https://pay.cakto.com.br/zeegt89_920646';
const STORAGE_KEY = 'verbo-plus-vitalicio-fechado';
const INTERVALO_REEXIBICAO_MS = 3 * 24 * 60 * 60 * 1000;

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
        const fechadoEm = Number(localStorage.getItem(STORAGE_KEY) || 0);
        if (!fechadoEm || Date.now() - fechadoEm >= INTERVALO_REEXIBICAO_MS) {
          setAberto(true);
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

  const fechar = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // A campanha continua funcionando mesmo se o armazenamento local estiver indisponível.
    }
    setAberto(false);
  };

  const abrirCheckout = () => {
    window.open(CHECKOUT_VITALICIO, '_blank', 'noopener,noreferrer');
  };

  if (!aberto || loading || !session?.user?.id || outroModalAberto) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plus-vitalicio-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) fechar();
      }}
    >
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#171123] text-white shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar oferta"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white/80 transition hover:bg-black/35 hover:text-white"
        >
          <X size={19} />
        </button>

        <div className="bg-gradient-to-br from-[#6D28D9] via-[#5B2DFF] to-[#3A1DB8] px-6 pb-6 pt-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
            <Zap size={25} fill="currentColor" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100">
            Oferta especial para usuários Verbo
          </p>
          <h2 id="plus-vitalicio-title" className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            Verbo PLUS<br />Vitalício
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-violet-100">
            Todos os recursos do PLUS com um único pagamento. Sem mensalidade.
          </p>
        </div>

        <div className="px-6 pb-6 pt-5 sm:px-7">
          <div className="flex items-center justify-center gap-2 text-sm text-violet-200/80">
            <span className="text-base line-through decoration-violet-300/70">R$ 47/mês</span>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Pagamento único
            </span>
          </div>

          <div className="mt-1 text-center">
            <span className="text-4xl font-black tracking-tight">R$ 97</span>
            <p className="mt-1 text-xs text-violet-200/75">Acesso vitalício aos recursos do PLUS incluídos nesta oferta</p>
          </div>

          <div className="my-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-300" />
              <p className="text-xs font-bold text-white">O que está incluído</p>
            </div>
            <ul className="space-y-2.5">
              {[
                'Sermões ilimitados',
                'Acesso completo à Academia Verbo',
                'Modo Púlpito e recursos avançados',
                'Acesso offline ilimitado aos sermões',
                'Atualizações futuras do Verbo',
                'Suporte prioritário',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-snug text-violet-50/90">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-3 text-center">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />
            <p className="text-xs font-semibold text-amber-100">
              Condição especial anunciada para apenas 20 vagas
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#4C1D95] shadow-lg shadow-black/10 transition hover:bg-violet-50 active:scale-[0.99]"
          >
            QUERO MEU PLUS VITALÍCIO
            <ArrowUpRight size={18} />
          </button>

          <button
            type="button"
            onClick={fechar}
            className="mt-3 w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-violet-200/70 transition hover:text-white"
          >
            Agora não, continuar usando o Verbo
          </button>

          <p className="mt-1 text-center text-[10px] leading-relaxed text-violet-200/45">
            Você será direcionado ao checkout seguro da Cakto. Confira as condições completas antes de finalizar a compra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlusVitalicioModal;
