import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, ScrollText, Clock, Trash2, Edit3,
  Bell, X, WifiOff, RefreshCw, CheckCircle2, Eye, EyeOff, Sparkles,
} from 'lucide-react';

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

// ✅ Indicador de sync (simples, sem dependências pesadas)
const SyncBadge = ({ isOnline, pendingCount }) => {
  if (isOnline && pendingCount === 0) return null;
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#4C1D95] transition-all">
      {!isOnline && <WifiOff size={11} />}
      {!isOnline ? 'Offline' : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
    </button>
  );
};

// ✅ Toast automático de nova notificação — aparece sem precisar clicar no sino
const ToastNotificacao = ({ notificacao, onAbrir, onFechar }) => {
  if (!notificacao) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
      <button
        onClick={onAbrir}
        className="w-full flex items-start gap-3 bg-slate-900 text-white rounded-[20px] shadow-2xl px-5 py-4 text-left active:scale-[0.98] transition-transform"
      >
        <div className="w-9 h-9 rounded-full bg-[#4C1D95] flex items-center justify-center shrink-0">
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-0.5">Nova novidade</p>
          <p className="text-sm font-bold leading-snug truncate">{notificacao.titulo}</p>
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
   * ✅ CARREGA DADOS OTIMIZADO: 1 query apenas
   * Antes: 3+ queries
   * Agora: 1 query com campos específicos
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

      // ✅ UMA query apenas: select de campos específicos
      const { data, error } = await supabase
        .from('sermoes')
        .select('id,titulo,created_at') // ← Apenas campos necessários
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10); // ← Limite para não carregar tudo

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
    e.stopPropagation();
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
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
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

      {/* Header */}
      <header className="mt-10 mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tighter leading-tight">
            {saudacao} ✨
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400 font-medium text-sm">
              {sermoes.length === 0
                ? 'Você ainda não criou nenhum sermão... Que tal começar agora?'
                : `Você tem ${sermoes.length} mensagens salvas.`}
            </p>
            <SyncBadge isOnline={isOnline} pendingCount={pendingCount} />
          </div>
        </div>

        {/* Notificações */}
        <div className="relative">
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
            className={`p-3 rounded-2xl transition-all relative ${
              showNotificacoes
                ? 'bg-[#4C1D95] text-white'
                : 'bg-white border border-gray-100 text-slate-400 shadow-sm'
            }`}
            aria-label={temNovidade ? `${naoLidas.length} notificações não lidas` : 'Notificações'}
          >
            <Bell size={20} />
            {temNovidade && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 border-2 border-white rounded-full text-[9px] font-bold text-white leading-none">
                {naoLidas.length > 9 ? '9+' : naoLidas.length}
              </span>
            )}
          </button>

          {showNotificacoes && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-[32px] border border-gray-100 shadow-2xl z-50 p-5 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                          ? 'bg-white border-purple-100 shadow-sm'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-800 mb-1">{n.titulo}</p>
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

      {/* Sermões */}
      <section>
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
          <h3 className="font-bold text-slate-800 uppercase text-[10px] tracking-[3px] opacity-40">
            {isOnline ? 'Suas Mensagens' : 'Suas Mensagens (offline)'}
          </h3>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-[28px]" />
              ))}
            </div>
          ) : sermoes.length > 0 ? (
            sermoes.map(sermao => (
              <div
                key={sermao.id}
                onClick={() => navigate(`/leitura/${sermao.id}`)}
                className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#4C1D95] group-hover:text-white transition-colors">
                    <ScrollText size={20} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-slate-700 text-sm line-clamp-1">
                      {sermao.titulo}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1">
                      <Clock size={12} />
                      {new Date(sermao.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/editor/${sermao.id}`);
                    }}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={e => excluirSermao(sermao.id, e)}
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <h2 className="text-2xl font-black text-slate-800 leading-tight mb-3">
                Vamos criar seu primeiro sermão em 3 minutos
              </h2>
              <p className="text-gray-400 text-sm mb-8 max-w-xs">
                Mesmo que você nunca tenha pregado antes, o Verbo te guia passo a passo.
              </p>
              <button
                onClick={() => navigate('/novosermao')}
                className="w-full max-w-xs bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Criar meu primeiro sermão
              </button>
              <p className="text-[11px] text-gray-300 mt-4">Leva menos de 3 minutos</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;