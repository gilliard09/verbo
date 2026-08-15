import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Trash2, Edit3, Eye, Search,
  Bell, X, WifiOff, Sparkles,
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * REDESIGN PREMIUM — princípios aplicados (ver brief completo do produto)
 * ═══════════════════════════════════════════════════════════════════════
 * Token system (90% neutro / 8% cinza / 2% roxo Verbo):
 *   Fundo …………………… #F5F5F7
 *   Superfície ………… #FFFFFF
 *   Texto principal … slate-900
 *   Texto secundário  gray-400 / gray-500
 *   Ação / marca …… #4C1D95 (roxo Verbo) — usado só em estado ativo,
 *                     link, nudge de ativação e indicadores de progresso
 *
 * O que mudou nesta tela, e por quê:
 * - Greeting drasticamente reduzido (era o elemento dominante da tela;
 *   agora é só contexto).
 * - Cards brancos com sombra e ícone por mensagem → lista editorial
 *   plana, com separador sutil em vez de caixa. Título carrega o peso
 *   visual; a data é só metadado.
 * - Busca adicionada no topo, estilo pill do iOS, filtrando por título
 *   (é o único campo textual que a query já carrega — ver comentário
 *   mais abaixo sobre como estender pra busca em conteúdo/referências).
 * - Editar/Excluir seguem escondidos até serem necessários: swipe pra
 *   esquerda ou toque-e-segure (já existia; só afinei o visual).
 * - Sombras e bordas fortes praticamente eliminadas: um único container
 *   branco com borda de 1px muito clara em vez de "card sobre card".
 *
 * O que NÃO mudou (por design — ver brief):
 * - Toda a lógica de dados, auth, offline-first, notificações, nudge de
 *   ativação e navegação continuam exatamente como estavam.
 * - O botão central roxo "Nova mensagem" da nav inferior não está neste
 *   arquivo (deve viver em Layout/BottomNav) — não foi tocado aqui.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ✅ Lazy load offline sync APENAS quando necessário
let useOfflineSync = null;
let getSermoesLocais = null;
const initOfflineModule = async () => {
  if (!useOfflineSync) {
    const mod = await import('../hooks/useOfflineSync');
    useOfflineSync = mod.useOfflineSync;
    const dbMod = await import('../lib/db');
    getSermoesLocais = dbMod.getSermoesLocais;
  }
};

// Chave de persistência de "notificações lidas" no dispositivo.
// Como ainda não existe uma tabela de leitura por usuário no Supabase,
// guardamos os ids já vistos localmente — simples e já resolve o badge
// voltar a marcar como "não lido" a cada reload.
const LIDAS_KEY = 'verbo_notificacoes_lidas';

const carregarIdsLidos = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(LIDAS_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const salvarIdsLidos = (idsSet) => {
  try {
    // Mantém só os últimos 100 ids para não crescer indefinidamente
    localStorage.setItem(LIDAS_KEY, JSON.stringify([...idsSet].slice(-100)));
  } catch {
    /* silencioso */
  }
};

// Formata data curta em pt-BR no estilo "09 de ago." (sem ano, compacto —
// combina com o tom editorial/minimalista da lista).
const MESES_ABREV = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const formatarDataCurta = (isoString) => {
  const d = new Date(isoString);
  return `${String(d.getDate()).padStart(2, '0')} de ${MESES_ABREV[d.getMonth()]}`;
};

// Normaliza texto para busca: remove acentos e caixa, pra "graça" achar
// "GRAÇA" e "graca" igualmente.
const normalizar = (str) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ✅ Indicador de sync (simples, sem dependências pesadas)
const SyncBadge = ({ isOnline, pendingCount }) => {
  if (isOnline && pendingCount === 0) return null;
  return (
    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-[#4C1D95]/[0.06] text-[#4C1D95] transition-all">
      {!isOnline && <WifiOff size={11} />}
      {!isOnline ? 'Offline' : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
    </button>
  );
};

// Chave de persistência do nudge de ativação — evita mostrar de novo
// depois que a pessoa já dispensou uma vez neste dispositivo.
const NUDGE_KEY = 'verbo_nudge_2osermao_dismissed';

// ─── Nudge de ativação: aparece só para quem tem exatamente 1 sermão ──────────
// Objetivo: puxar o usuário do 1º para o 2º sermão, que é onde os dados
// mostram a maior queda de engajamento (73 → 17 usuários). Não é uma oferta
// comercial — é só reforço de hábito, sem falar em plano pago.
// (Mantido com identidade roxa — é um dos poucos lugares onde o roxo em
// área grande se justifica: é a ação mais importante da tela pra quem
// ainda não criou hábito.)
const NudgeAtivacao = ({ onCriar, onDispensar }) => (
  <div className="mb-6 relative bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] rounded-[24px] p-5 shadow-sm overflow-hidden">
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
    <button
      onClick={onDispensar}
      aria-label="Dispensar sugestão"
      className="absolute top-3 right-3 p-1.5 text-white/50 hover:text-white/90 transition-colors"
    >
      <X size={16} />
    </button>
    <div className="relative z-10 pr-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-200 mb-1.5">
        Continue por aqui
      </p>
      <p className="text-white font-semibold text-sm leading-snug mb-4">
        Seu primeiro sermão já está pronto. Que tal preparar o próximo enquanto a ideia está fresca?
      </p>
      <button
        onClick={onCriar}
        className="bg-white text-[#4C1D95] text-xs font-semibold px-4 py-2.5 rounded-xl active:scale-95 transition-all"
      >
        Criar meu 2º sermão
      </button>
    </div>
  </div>
);

// ✅ Toast automático de nova notificação — aparece sem precisar clicar no sino
const ToastNotificacao = ({ notificacao, onAbrir, onFechar }) => {
  if (!notificacao) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
      <button
        onClick={onAbrir}
        className="w-full flex items-start gap-3 bg-slate-900 text-white rounded-[20px] shadow-lg px-5 py-4 text-left active:scale-[0.98] transition-transform"
      >
        <div className="w-9 h-9 rounded-full bg-[#4C1D95] flex items-center justify-center shrink-0">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-300 mb-0.5">Nova novidade</p>
          <p className="text-sm font-semibold leading-snug truncate">{notificacao.titulo}</p>
        </div>
        <span
          onClick={(e) => { e.stopPropagation(); onFechar(); }}
          className="shrink-0 opacity-60 hover:opacity-100 p-1"
        >
          <X size={16} />
        </span>
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Linha de sermão: lista editorial, sem card/ícone, com swipe-to-reveal ──
// ── e long-press (estilo Notas da Apple) — só título + data + separador ──
// ═══════════════════════════════════════════════════════════════════════════
const ACTION_WIDTH = 72; // largura de cada botão de ação revelado no swipe
const SWIPE_OPEN_DISTANCE = ACTION_WIDTH * 2; // dois botões: editar + excluir
const SWIPE_THRESHOLD = SWIPE_OPEN_DISTANCE / 2.2;
const LONG_PRESS_MS = 480;
const MOVE_CANCEL_THRESHOLD = 10;

const SermaoRow = ({ sermao, isOpen, onOpenChange, onNavigate, onEdit, onDelete, onLongPress }) => {
  const [dragX, setDragX] = useState(isOpen ? -SWIPE_OPEN_DISTANCE : 0);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const pointerIdRef = useRef(null);

  useEffect(() => {
    setDragX(isOpen ? -SWIPE_OPEN_DISTANCE : 0);
  }, [isOpen]);

  const limparLongPress = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('[data-swipe-ignore]')) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = isOpen ? -SWIPE_OPEN_DISTANCE : 0;
    draggingRef.current = false;
    movedRef.current = false;

    limparLongPress();
    longPressTimerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        if (navigator.vibrate) navigator.vibrate(8);
        onLongPress(sermao, e.clientX, e.clientY);
      }
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!movedRef.current && (Math.abs(dx) > MOVE_CANCEL_THRESHOLD || Math.abs(dy) > MOVE_CANCEL_THRESHOLD)) {
      movedRef.current = true;
      limparLongPress();
    }

    // Só ativa o drag horizontal se o movimento for predominantemente horizontal
    if (movedRef.current && Math.abs(dx) > Math.abs(dy)) {
      draggingRef.current = true;
      setDragging(true);
      let novoX = currentXRef.current + dx;
      novoX = Math.min(0, Math.max(-SWIPE_OPEN_DISTANCE - 24, novoX));
      setDragX(novoX);
    }
  };

  const finalizarGesto = (e) => {
    limparLongPress();
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;

    if (draggingRef.current) {
      setDragging(false);
      setDragX((atual) => {
        const abrir = atual < -SWIPE_THRESHOLD;
        onOpenChange(abrir ? sermao.id : null);
        return abrir ? -SWIPE_OPEN_DISTANCE : 0;
      });
    } else if (!movedRef.current) {
      // Foi um tap simples
      if (isOpen) {
        onOpenChange(null);
      } else {
        onNavigate(sermao.id);
      }
    }
    draggingRef.current = false;
    movedRef.current = false;
  };

  return (
    <div className="relative overflow-hidden select-none">
      {/* Ações reveladas atrás da linha — flat, sem cantos arredondados,
          pra não parecer "botão" e sim uma extensão da própria lista */}
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: SWIPE_OPEN_DISTANCE }}>
        <button
          data-swipe-ignore
          onClick={() => { onOpenChange(null); onEdit(sermao.id); }}
          className="flex flex-col items-center justify-center gap-1 bg-blue-500 text-white active:bg-blue-600 transition-colors"
          style={{ width: ACTION_WIDTH }}
        >
          <Edit3 size={17} />
          <span className="text-[9px] font-semibold uppercase">Editar</span>
        </button>
        <button
          data-swipe-ignore
          onClick={(e) => { e.stopPropagation(); onOpenChange(null); onDelete(sermao.id, e); }}
          className="flex flex-col items-center justify-center gap-1 bg-red-500 text-white active:bg-red-600 transition-colors"
          style={{ width: ACTION_WIDTH }}
        >
          <Trash2 size={17} />
          <span className="text-[9px] font-semibold uppercase">Excluir</span>
        </button>
      </div>

      {/* Linha em si — sem ícone, sem borda própria, sem sombra. O título
          carrega o peso visual; a data é só metadado discreto. */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finalizarGesto}
        onPointerCancel={finalizarGesto}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: 'pan-y',
        }}
        className="relative z-10 bg-white px-5 py-4 flex items-center cursor-pointer active:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-[15px] leading-snug line-clamp-1">
            {sermao.titulo}
          </h4>
          {/* Referência bíblica / tempo de leitura entrariam aqui assim que
              existirem campos correspondentes na tabela `sermoes` — hoje
              só temos título e data, então mostramos só o que é real. */}
          <p className="text-[12px] text-gray-400 mt-0.5">
            {formatarDataCurta(sermao.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Menu de contexto (long-press), estilo iOS ────────────────────────────────
const MenuContexto = ({ menu, onFechar, onAbrir, onEditar, onExcluir }) => {
  if (!menu) return null;
  const larguraMenu = 190;
  const alturaEstimada = 148;
  const margem = 16;
  let left = menu.x - larguraMenu / 2;
  left = Math.max(margem, Math.min(left, window.innerWidth - larguraMenu - margem));
  let top = menu.y - alturaEstimada - 16;
  if (top < margem) top = menu.y + 16;

  return (
    <>
      <div
        className="fixed inset-0 z-[140] bg-black/10 backdrop-blur-[2px]"
        onClick={onFechar}
      />
      <div
        className="fixed z-[141] w-[190px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 overflow-hidden"
        style={{ left, top }}
      >
        <button
          onClick={() => { onAbrir(menu.sermao.id); onFechar(); }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 transition-colors"
        >
          Abrir
          <Eye size={16} className="text-slate-400" />
        </button>
        <div className="h-px bg-black/5" />
        <button
          onClick={() => { onEditar(menu.sermao.id); onFechar(); }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 transition-colors"
        >
          Editar
          <Edit3 size={16} className="text-blue-500" />
        </button>
        <div className="h-px bg-black/5" />
        <button
          onClick={(e) => { onExcluir(menu.sermao.id, e); onFechar(); }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-red-500 active:bg-red-50 transition-colors"
        >
          Excluir
          <Trash2 size={16} />
        </button>
      </div>
    </>
  );
};

// ✅ MAIN COMPONENT
const Dashboard = () => {
  const navigate = useNavigate();
  const [saudacao, setSaudacao] = useState('Olá');
  const [sermoes, setSermoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificacoes, setNotificacoes] = useState([]);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [idsLidos, setIdsLidos] = useState(() => carregarIdsLidos());
  const [expandedId, setExpandedId] = useState(null);
  const [toastNotificacao, setToastNotificacao] = useState(null);
  const [nudgeDispensado, setNudgeDispensado] = useState(
    () => localStorage.getItem(NUDGE_KEY) === '1'
  );

  // Busca (nova) — filtra localmente por título, que é o único campo de
  // texto que a query carrega hoje. Pra estender pra conteúdo/referência
  // bíblica/tema, inclua os campos correspondentes no .select() de
  // carregarDados() e adicione-os no `alvo` do filtro abaixo.
  const [busca, setBusca] = useState('');

  // Swipe-to-reveal: apenas uma linha pode estar aberta por vez
  const [openSwipeId, setOpenSwipeId] = useState(null);
  // Menu de contexto (long-press): { sermao, x, y }
  const [menuContexto, setMenuContexto] = useState(null);

  // Mostra o nudge só para quem tem exatamente 1 sermão e ainda não dispensou
  const mostrarNudgeAtivacao = !loading && sermoes.length === 1 && !nudgeDispensado;

  const dispensarNudge = () => {
    setNudgeDispensado(true);
    try { localStorage.setItem(NUDGE_KEY, '1'); } catch { /* silencioso */ }
  };

  // ✅ Offline state (lazy init)
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const offlineInitialized = useRef(false);

  const abortControllerRef = useRef(null);
  const notificacoesTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Quantas notificações ainda não foram vistas neste dispositivo
  const naoLidas = notificacoes.filter(n => !idsLidos.has(n.id));
  const temNovidade = naoLidas.length > 0;

  // Lista filtrada pela busca (client-side — a lista completa já vem sem
  // limite artificial desde a correção anterior, então isso é barato).
  const sermoesFiltrados = useMemo(() => {
    if (!busca.trim()) return sermoes;
    const alvo = normalizar(busca);
    return sermoes.filter(s => normalizar(s.titulo).includes(alvo));
  }, [sermoes, busca]);

  // ✅ Detectar online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ Init offline APENAS quando necessário (lazy)
  useEffect(() => {
    if (!isOnline && !offlineInitialized.current) {
      offlineInitialized.current = true;
      initOfflineModule().then(() => {
        // Carrega dados offline após módulo pronto
        carregarDados(abortControllerRef.current?.signal);
      });
    }
  }, [isOnline]);

  // ✅ Carregamento inicial (OTIMIZADO: 2 queries em paralelo apenas)
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const timeouts = [];

    // Carrega dados + notificações em paralelo
    Promise.all([
      carregarDados(abortControllerRef.current.signal),
      carregarNotificacoes(),
    ]);

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      timeouts.forEach(t => clearTimeout(t));
      clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ✅ Re-carregar quando volta online
  useEffect(() => {
    if (isOnline) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      carregarDados(controller.signal);
    }
  }, [isOnline]);

  /**
   * ✅ CARREGA DADOS
   * 1 query, sem limite artificial (só campos específicos, então o custo
   * extra de trazer todos os registros é mínimo).
   */
  async function carregarDados(signal) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) {
        setLoading(false);
        return;
      }

      // Saudação
      const nomeCompleto = user.user_metadata?.full_name || 'Pregador';
      const hora = new Date().getHours();
      let periodo = 'Bom dia';
      if (hora >= 12 && hora < 18) periodo = 'Boa tarde';
      if (hora >= 18 || hora < 5) periodo = 'Boa noite';
      const ehPastor = user.email === 'jefersonrocha998@gmail.com';
      setSaudacao(`${periodo}, ${ehPastor ? 'Pastor ' : ''}${nomeCompleto.split(' ')[0]}`);

      // ✅ UMA query apenas: select de campos específicos, sem limite artificial
      const { data, error } = await supabase
        .from('sermoes')
        .select('id,titulo,created_at') // ← Apenas campos necessários
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (signal?.aborted) return;

      if (!error && data) {
        setSermoes(data);
      } else if (!isOnline && getSermoesLocais) {
        // Fallback offline
        const locais = await getSermoesLocais(user.id);
        if (signal?.aborted) return;
        setSermoes(locais);
        console.info('[Verbo] Offline — carregando do cache local.');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * ✅ Carrega notificações (com rate limit)
   * Rate limit: máx 1 chamada a cada 30s
   */
  async function carregarNotificacoes() {
    if (!navigator.onLine || notificacoesTimeoutRef.current) return;

    try {
      const { data } = await supabase
        .from('notificacoes')
        .select('id,titulo,mensagem,tipo,link,created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setNotificacoes(data);

        // Dispara o toast automático só para a notificação mais recente
        // ainda não vista neste dispositivo — sem precisar clicar no sino.
        const idsLidosAtual = carregarIdsLidos();
        const maisRecenteNaoLida = data.find(n => !idsLidosAtual.has(n.id));
        if (maisRecenteNaoLida) {
          setToastNotificacao(maisRecenteNaoLida);
          clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setToastNotificacao(null), 6000);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }

    // Rate limit: próxima chamada só em 30s
    notificacoesTimeoutRef.current = true;
    setTimeout(() => {
      notificacoesTimeoutRef.current = null;
    }, 30000);
  }

  // Marca todas as notificações carregadas como lidas e persiste no dispositivo
  const marcarTodasComoLidas = useCallback(() => {
    setIdsLidos(prev => {
      const novo = new Set(prev);
      notificacoes.forEach(n => novo.add(n.id));
      salvarIdsLidos(novo);
      return novo;
    });
  }, [notificacoes]);

  /**
   * ✅ Excluir sermão (otimizado offline)
   */
  async function excluirSermao(id, e) {
    e?.stopPropagation?.();
    if (!window.confirm('Deseja excluir esta mensagem permanentemente?')) return;

    setSermoes(prev => prev.filter(s => s.id !== id));

    if (navigator.onLine) {
      try {
        await supabase.from('sermoes').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao excluir:', err);
        carregarDados(abortControllerRef.current?.signal);
      }
    }
  }

  const handleNotificacaoClick = (n) => {
    if (expandedId === n.id) {
      if (n.link) window.open(n.link, '_blank');
      else setExpandedId(null);
    } else {
      setExpandedId(n.id);
    }
  };

  const abrirPainelViaToast = () => {
    setToastNotificacao(null);
    clearTimeout(toastTimeoutRef.current);
    setShowNotificacoes(true);
    marcarTodasComoLidas();
  };

  return (
    <div
      className="min-h-screen bg-[#F5F5F7] px-5 pt-8 pb-32"
      onClick={() => { if (openSwipeId) setOpenSwipeId(null); }}
    >
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-down { animation: slide-down 0.35s ease; }
      `}</style>

      {/* ── Toast automático de novidade ── */}
      <ToastNotificacao
        notificacao={toastNotificacao}
        onAbrir={abrirPainelViaToast}
        onFechar={() => { setToastNotificacao(null); clearTimeout(toastTimeoutRef.current); }}
      />

      {/* ── Menu de contexto (long-press) ── */}
      <MenuContexto
        menu={menuContexto}
        onFechar={() => setMenuContexto(null)}
        onAbrir={(id) => navigate(`/leitura/${id}`)}
        onEditar={(id) => navigate(`/editor/${id}`)}
        onExcluir={excluirSermao}
      />

      {/* ── Header — drasticamente reduzido: contexto, não protagonista ── */}
      <header className="mb-6 flex justify-between items-start gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight truncate">
            {saudacao}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-gray-400 text-[13px]">
              {sermoes.length === 0
                ? 'Nenhum sermão ainda. Que tal começar?'
                : `${sermoes.length} mensage${sermoes.length == 1 ? 'm' :sermoes.length > 1 ? 'ns' : ''} salva${sermoes.length > 1 ? 's' : ''}`}
            </p>
            <SyncBadge isOnline={isOnline} pendingCount={pendingCount} />
          </div>
        </div>

        {/* Notificações — sem preenchimento colorido em repouso; o roxo
            aparece só quando o painel está aberto (estado ativo) */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              const abrindo = !showNotificacoes;
              setShowNotificacoes(abrindo);
              if (abrindo) {
                marcarTodasComoLidas();
                setToastNotificacao(null);
                clearTimeout(toastTimeoutRef.current);
              }
            }}
            className={`p-2.5 rounded-full transition-all relative ${
              showNotificacoes
                ? 'bg-[#4C1D95] text-white'
                : 'bg-white text-slate-400 border border-gray-100'
            }`}
            aria-label={temNovidade ? `${naoLidas.length} notificações não lidas` : 'Notificações'}
          >
            <Bell size={18} />
            {temNovidade && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-red-500 border-2 border-[#F5F5F7] rounded-full text-[8px] font-bold text-white leading-none">
                {naoLidas.length > 9 ? '9+' : naoLidas.length}
              </span>
            )}
          </button>

          {showNotificacoes && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-[24px] border border-gray-100 shadow-lg z-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Novidades
                </h4>
                <button onClick={() => setShowNotificacoes(false)}>
                  <X size={16} className="text-slate-300" />
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {notificacoes.length > 0 ? (
                  notificacoes.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificacaoClick(n)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                        expandedId === n.id
                          ? 'bg-white border-purple-100'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800 mb-1">{n.titulo}</p>
                      <p className={`text-xs text-slate-500 leading-relaxed ${expandedId === n.id ? '' : 'line-clamp-2'}`}>
                        {n.mensagem}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-4">
                    Tudo atualizado por aqui!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Busca — pill estilo iOS, integrada ao layout ── */}
      <div className="relative mb-6" onClick={(e) => e.stopPropagation()}>
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar mensagens"
          className="w-full bg-[#EBEBEF] text-[14px] text-slate-700 placeholder-gray-400 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#4C1D95]/15 transition-all"
        />
      </div>

      {/* ── Nudge de ativação (1º → 2º sermão) ── */}
      {mostrarNudgeAtivacao && (
        <div onClick={(e) => e.stopPropagation()}>
          <NudgeAtivacao
            onCriar={() => navigate('/novosermao')}
            onDispensar={dispensarNudge}
          />
        </div>
      )}

      {/* Sermões */}
      <section onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-semibold text-slate-400 uppercase text-[11px] tracking-[2px]">
            {isOnline ? 'Suas mensagens' : 'Suas mensagens (offline)'}
          </h3>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/60 rounded-2xl" />
            ))}
          </div>
        ) : sermoes.length > 0 ? (
          sermoesFiltrados.length > 0 ? (
            // Lista editorial: um único container branco com separadores
            // sutis entre linhas, em vez de um card por mensagem.
            <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden">
              {sermoesFiltrados.map((sermao, idx) => (
                <React.Fragment key={sermao.id}>
                  <SermaoRow
                    sermao={sermao}
                    isOpen={openSwipeId === sermao.id}
                    onOpenChange={(id) => setOpenSwipeId(id)}
                    onNavigate={(id) => navigate(`/leitura/${id}`)}
                    onEdit={(id) => navigate(`/editor/${id}`)}
                    onDelete={excluirSermao}
                    onLongPress={(sermaoAlvo, x, y) => {
                      setOpenSwipeId(null);
                      setMenuContexto({ sermao: sermaoAlvo, x, y });
                    }}
                  />
                  {idx < sermoesFiltrados.length - 1 && (
                    <div className="h-px bg-gray-100 ml-5" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            // Sem resultado pra busca — vazio orientado à ação, sem CTA de
            // criar (o problema aqui não é falta de conteúdo, é a busca).
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <p className="text-slate-600 font-medium text-sm mb-1">
                Nada encontrado para "{busca}"
              </p>
              <button
                onClick={() => setBusca('')}
                className="text-[#4C1D95] text-sm font-semibold mt-2"
              >
                Limpar busca
              </button>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-3">
              Vamos criar seu primeiro sermão em 3 minutos
            </h2>
            <p className="text-gray-400 text-sm mb-8 max-w-xs">
              Mesmo que você nunca tenha pregado antes, o Verbo te guia passo a passo.
            </p>
            <button
              onClick={() => navigate('/novosermao')}
              className="w-full max-w-xs bg-[#4C1D95] text-white font-semibold py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              Criar meu primeiro sermão
            </button>
            <p className="text-[11px] text-gray-300 mt-4">Leva menos de 3 minutos</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;