import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Sparkles, ScrollText, Clock, Trash2, Edit3,
  Bell, X, Megaphone, Sparkle, ChevronDown, ChevronUp,
  WifiOff, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Offline layer ──────────────────────────────────────────────────────────────
import { getSermoesLocais, deleteSermaoLocal, enqueueOp } from '../lib/db';
import { useOfflineSync } from '../hooks/useOfflineSync';

// ── Indicador de status de sync ───────────────────────────────────────────────
const SyncBadge = ({ isOnline, pendingCount, syncStatus, onSync }) => {
  if (isOnline && pendingCount === 0 && syncStatus === 'idle') return null;

  const label = !isOnline
    ? 'Offline'
    : syncStatus === 'syncing'
      ? 'Sincronizando...'
      : syncStatus === 'done'
        ? 'Sincronizado!'
        : pendingCount > 0
          ? `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
          : null;

  if (!label) return null;

  const cor = !isOnline
    ? 'bg-slate-100 text-slate-500'
    : syncStatus === 'done'
      ? 'bg-green-50 text-green-600'
      : 'bg-purple-50 text-[#5B2DFF]';

  return (
    <button
      onClick={isOnline && pendingCount > 0 ? onSync : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cor} transition-all`}
    >
      {!isOnline && <WifiOff size={11} />}
      {syncStatus === 'syncing' && <RefreshCw size={11} className="animate-spin" />}
      {syncStatus === 'done'    && <CheckCircle2 size={11} />}
      {label}
    </button>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [saudacao, setSaudacao]         = useState('Olá');
  const [sermoes, setSermoes]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [notificacoes, setNotificacoes] = useState([]);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [temNovidade, setTemNovidade]   = useState(false);
  const [expandedId, setExpandedId]     = useState(null);

  const userIdRef = useRef(null);
  const { isOnline, pendingCount, syncStatus, sincronizar, atualizarPendentes } = useOfflineSync();

  useEffect(() => {
    carregarDados();
    carregarNotificacoes();
  }, []);

  // Re-carrega quando volta online (após sync)
  useEffect(() => {
    if (isOnline && syncStatus === 'done') {
      carregarDados();
    }
  }, [syncStatus]);

  async function carregarNotificacoes() {
    if (!navigator.onLine) return;
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) { setNotificacoes(data); if (data.length > 0) setTemNovidade(true); }
  }

  async function carregarDados() {
    // getSession() lê do cache local — funciona offline sem request de rede
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (user) {
      userIdRef.current = user.id;
      const nomeCompleto = user.user_metadata?.full_name || 'Pregador';
      const hora = new Date().getHours();
      let periodo = 'Bom dia';
      if (hora >= 12 && hora < 18) periodo = 'Boa tarde';
      if (hora >= 18 || hora < 5)  periodo = 'Boa noite';
      const ehPastor = user.email === 'jefersonrocha998@gmail.com';
      setSaudacao(`${periodo}, ${ehPastor ? 'Pastor ' : ''}${nomeCompleto.split(' ')[0]}`);
    }

    // Tenta Supabase (online) — se falhar, cai no IndexedDB
    if (userIdRef.current) {
      try {
        const { data, error } = await supabase
          .from('sermoes')
          .select('*')
          .eq('user_id', userIdRef.current)
          .order('created_at', { ascending: false });
        if (!error && data) { setSermoes(data); setLoading(false); return; }
      } catch {
        // Rede indisponível — usa cache
      }

      // Fallback offline: IndexedDB
      const locais = await getSermoesLocais(userIdRef.current);
      setSermoes(locais);
      console.info('[Verbo] Offline — carregando do cache local.');
    }

    setLoading(false);
  }

  async function excluirSermao(id, e) {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir esta mensagem permanentemente?')) return;

    // Remove localmente imediatamente
    setSermoes(prev => prev.filter(s => s.id !== id));
    await deleteSermaoLocal(id);

    if (navigator.onLine) {
      // Online: deleta direto
      await supabase.from('sermoes').delete().eq('id', id);
    } else {
      // Offline: enfileira para quando conectar
      await enqueueOp('delete', id);
      await atualizarPendentes();
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

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      <header className="mt-10 mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tighter leading-tight">
            {saudacao} <Sparkles className="inline text-yellow-400 mb-1" size={24} />
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400 font-medium text-sm">
              {sermoes.length === 0
                ? 'Você ainda não criou nenhum sermão... Que tal começar agora?'
                : `Você tem ${sermoes.length} mensagens salvas.`}
            </p>
            {/* Badge de sync inline */}
            <SyncBadge
              isOnline={isOnline}
              pendingCount={pendingCount}
              syncStatus={syncStatus}
              onSync={sincronizar}
            />
          </div>
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => { setShowNotificacoes(!showNotificacoes); setTemNovidade(false); }}
            className={`p-3 rounded-2xl transition-all relative ${showNotificacoes ? 'bg-[#5B2DFF] text-white' : 'bg-white border border-gray-100 text-slate-400 shadow-sm'}`}
          >
            <Bell size={20} />
            {temNovidade && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>

          {showNotificacoes && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-[32px] border border-gray-100 shadow-2xl z-50 p-5 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Novidades</h4>
                <button onClick={() => { setShowNotificacoes(false); setExpandedId(null); }}>
                  <X size={16} className="text-slate-300" />
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {notificacoes.length > 0 ? notificacoes.map(n => {
                  const isExpanded = expandedId === n.id;
                  return (
                    <div key={n.id} onClick={() => handleNotificacaoClick(n)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border ${isExpanded ? 'bg-white border-purple-100 shadow-sm' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {n.tipo === 'promocao' ? <Sparkle size={12} className="text-orange-500" /> : <Megaphone size={12} className="text-blue-500" />}
                          <span className="text-[10px] font-black text-slate-800 uppercase leading-none">{n.titulo}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={12} className="text-slate-300" /> : <ChevronDown size={12} className="text-slate-300" />}
                      </div>
                      <p className={`text-[11px] text-slate-500 leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>{n.mensagem}</p>
                      {isExpanded && n.link && (
                        <div className="mt-3 pt-2 border-t border-slate-50 flex justify-end">
                          <span className="text-[9px] font-black text-[#5B2DFF] uppercase tracking-tighter">Clique para ver mais →</span>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-[11px] text-gray-400 italic text-center py-4">Tudo atualizado por aqui!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[3px] opacity-40">
            {isOnline ? 'Suas Mensagens' : 'Suas Mensagens (offline)'}
          </h3>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-[28px]" />)}
            </div>
          ) : sermoes.length > 0 ? (
            sermoes.map(sermao => (
              <div
                key={sermao.id}
                onClick={() => navigate(`/leitura/${sermao.id}`)}
                className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#5B2DFF] group-hover:text-white transition-colors relative">
                    <ScrollText size={20} />
                    {/* Indicador de pendente offline */}
                    {sermao._synced === false && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-white rounded-full" title="Aguardando sincronização" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-slate-700 text-sm line-clamp-1">{sermao.titulo}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1">
                      <Clock size={12} />
                      {new Date(sermao.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/editor/${sermao.id}`); }}
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
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">

    {/* Headline forte */}
    <h2 className="text-2xl font-black text-slate-800 leading-tight mb-3">
      Vamos criar seu primeiro sermão em 3 minutos
    </h2>

    {/* Subtexto que remove objeção */}
    <p className="text-gray-400 text-sm mb-8 max-w-xs">
      Mesmo que você nunca tenha pregado antes, o Verbo te guia passo a passo.
    </p>

    {/* Botão principal (AÇÃO) */}
    <button
      onClick={() => navigate('/NovoSermao')}
      className="w-full max-w-xs bg-[#5B2DFF] text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
    >
      Criar meu primeiro sermão
    </button>

    {/* Micro reforço */}
    <p className="text-[11px] text-gray-300 mt-4">
      Leva menos de 3 minutos
    </p>

  </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;