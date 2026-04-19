import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Save, ArrowLeft, Book, Loader2,
  Bold, Italic, Quote, Highlighter, CheckCircle2,
  Clock, AlignLeft, RotateCcw, Maximize2, Minimize2,
  AlertTriangle, X, Lock, WifiOff,
} from 'lucide-react';

// ── Offline layer ──────────────────────────────────────────────────────────────
import { getSermaoLocal, upsertSermaoLocal, enqueueOp } from '../lib/db';
import { gerarIdLocal } from '../lib/sync';
import { useOfflineSync } from '../hooks/useOfflineSync';

const PALAVRAS_POR_MINUTO = 120;
const AUTO_SAVE_DELAY     = 30000;
const RASCUNHO_KEY  = (id) => `verbo_rascunho_${id  || 'novo'}`;
const HISTORICO_KEY = (id) => `verbo_historico_${id || 'novo'}`;

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ visivel, tipo, mensagem, onFechar }) => (
  <div className={`fixed top-6 left-1/2 z-[200] transition-all duration-400 ${visivel ? '-translate-x-1/2 translate-y-0 opacity-100 scale-100' : '-translate-x-1/2 -translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-[20px] shadow-2xl border ${tipo === 'sucesso' ? 'bg-green-500 border-green-400 text-white' : tipo === 'erro' ? 'bg-red-500 border-red-400 text-white' : 'bg-slate-900 border-white/10 text-white'}`}>
      {tipo === 'sucesso' && <CheckCircle2 size={16} />}
      {tipo === 'erro'    && <AlertTriangle size={16} />}
      {tipo === 'offline' && <WifiOff size={16} />}
      <span className="text-xs font-black uppercase tracking-wide">{mensagem}</span>
      <button onClick={onFechar} className="ml-1 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  </div>
);

// ─── Editor ───────────────────────────────────────────────────────────────────
const Editor = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();                          // ← NOVO
  const textAreaRef = useRef(null);

  // ── Tipo via URL ─────────────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);       // ← NOVO
  const tipo   = params.get('tipo');                         // ← NOVO

  const podeCreiarSermao = true;
  const sermoesRestantes = null;
  const isPlus           = true;
  const percentualUso    = 0;

  const [titulo,     setTitulo]     = useState('');
  const [conteudo,   setConteudo]   = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [telaCheia,  setTelaCheia]  = useState(true);
  const [autoSaveAtivo, setAutoSaveAtivo] = useState(false);
  const autoSaveRef = useRef(null);
  const [historico,       setHistorico]       = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [toast, setToast] = useState({ visivel: false, tipo: 'info', mensagem: '' });

  // Id local para sermões criados offline
  const localIdRef = useRef(id || null);

  const { isOnline, atualizarPendentes } = useOfflineSync();

  const metricas = useMemo(() => {
    const palavras = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;
    return { palavras, minutos: Math.ceil(palavras / PALAVRAS_POR_MINUTO) };
  }, [conteudo]);

  const mostrarToast = useCallback((mensagem, tipo = 'info', duracao = 3500) => {
    setToast({ visivel: true, tipo, mensagem });
    setTimeout(() => setToast(t => ({ ...t, visivel: false })), duracao);
  }, []);

  // ── Estrutura guiada pelo tipo ────────────────────────────────────────────
  useEffect(() => {                                          // ← NOVO
    if (!id && !conteudo && tipo) {
      if (tipo === 'expositivo') {
        setConteudo(
`Texto base:

Introdução:

Contexto:

Ponto 1:

Ponto 2:

Ponto 3:

Conclusão:

Aplicação:`
        );
      }
      if (tipo === 'tematico') {
        setConteudo(
`Tema:

Texto base:

Introdução:

Ponto 1:

Ponto 2:

Ponto 3:

Conclusão:

Aplicação:`
        );
      }
      if (tipo === 'devocional') {
        setConteudo(
`Versículo:

Reflexão:

Aplicação prática:

Oração:`
        );
      }
    }
  }, [tipo, id]);                                            // ← NOVO

  // ── Foco automático no mobile ────────────────────────────────────────────
  useEffect(() => {                                          // ← NOVO
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 300);
  }, []);

  // ── Carregamento inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      carregarSermao(id);
    } else {
      // Sermão novo: tenta rascunho do localStorage (só se não veio com tipo guiado)
      if (!tipo) {
        const rascunho = localStorage.getItem(RASCUNHO_KEY(null));
        if (rascunho) {
          try {
            const { titulo: t, conteudo: c, referencia: r, savedAt } = JSON.parse(rascunho);
            setTitulo(t || ''); setConteudo(c || ''); setReferencia(r || '');
            const tempo = new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            mostrarToast(`Rascunho recuperado das ${tempo}`, 'info');
          } catch { /* silencioso */ }
        }
      }
    }
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY(id)) || '[]');
      setHistorico(hist);
    } catch { /* silencioso */ }
  }, [id, tipo]);

  async function carregarSermao(sermoId) {
    // 1. Carrega do IndexedDB imediatamente (sem esperar rede)
    const local = await getSermaoLocal(sermoId);
    if (local) {
      setTitulo(local.titulo || '');
      setConteudo(local.conteudo || '');
      setReferencia(local.referencia_biblica || '');
    }

    // 2. Tenta buscar versão mais recente do Supabase
    try {
      const { data, error } = await supabase
        .from('sermoes').select('*').eq('id', sermoId).single();
      if (error) throw error;
      if (data) {
        const localAt  = local ? new Date(local.updated_at || local.created_at || 0) : new Date(0);
        const remotoAt = new Date(data.updated_at || data.created_at || 0);
        if (remotoAt >= localAt) {
          setTitulo(data.titulo || '');
          setConteudo(data.conteudo || '');
          setReferencia(data.referencia_biblica || '');
          await upsertSermaoLocal({ ...data, _synced: true });
        }
      }
    } catch {
      if (!local) {
        mostrarToast('Offline e sem cache local para este sermão', 'erro');
      }
    }
  }

  // ── Auto-save no localStorage (rascunho) ───────────────────────────────────
  useEffect(() => {
    if (!conteudo && !titulo) return;
    clearTimeout(autoSaveRef.current);
    setAutoSaveAtivo(false);
    autoSaveRef.current = setTimeout(() => {
      setAutoSaveAtivo(true);
      const dados = { titulo, conteudo, referencia, savedAt: new Date().toISOString() };
      localStorage.setItem(RASCUNHO_KEY(id), JSON.stringify(dados));
      setTimeout(() => setAutoSaveAtivo(false), 2000);
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(autoSaveRef.current);
  }, [titulo, conteudo, referencia, id]);

  // ── Formatação de texto ────────────────────────────────────────────────────
  const aplicarFormatacao = useCallback((prefixo, sufixo) => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const novo  = conteudo.substring(0, start) + prefixo + conteudo.substring(start, end) + sufixo + conteudo.substring(end);
    setConteudo(novo);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefixo.length, end + prefixo.length);
    }, 10);
  }, [conteudo]);

  // ── Salvar ─────────────────────────────────────────────────────────────────
  async function salvar() {
    if (!titulo.trim()) { mostrarToast('Insira um título para salvar.', 'erro'); return; }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Sessão não encontrada');
      const agora = new Date().toISOString();

      if (id && conteudo.trim()) {
        const novoHistorico = [
          { conteudo, titulo, referencia, savedAt: agora },
          ...historico.slice(0, 4),
        ];
        localStorage.setItem(HISTORICO_KEY(id), JSON.stringify(novoHistorico));
        setHistorico(novoHistorico);
      }

      const dadosSermao = {
        titulo,
        conteudo,
        referencia_biblica: referencia,
        user_id: user.id,
      };

      let salvouOnline = false;
      try {
        const res = id
          ? await supabase.from('sermoes').update(dadosSermao).eq('id', id)
          : await supabase.from('sermoes').insert([dadosSermao]).select().single();

        if (!res.error) {
          const idFinal = id || res.data?.id;
          if (idFinal) {
            await upsertSermaoLocal({
              ...dadosSermao,
              id: idFinal,
              created_at: res.data?.created_at || agora,
              _synced: true,
            });
          }
          salvouOnline = true;
          localStorage.removeItem(RASCUNHO_KEY(id));
          mostrarToast('Sermão salvo com sucesso!', 'sucesso');
          setTimeout(() => navigate('/'), 1200);
        }
      } catch {
        // Rede indisponível — salva offline abaixo
      }

      if (!salvouOnline) {
        if (id) {
          const local = await getSermaoLocal(id) || {};
          const atualizado = { ...local, ...dadosSermao, id, _synced: false };
          await upsertSermaoLocal(atualizado);
          await enqueueOp('update', id, atualizado);
        } else {
          if (!localIdRef.current || !localIdRef.current.startsWith('local_')) {
            localIdRef.current = gerarIdLocal();
          }
          const novoLocal = {
            ...dadosSermao,
            id: localIdRef.current,
            created_at: agora,
            local_temp_id: localIdRef.current,
            _synced: false,
          };
          await upsertSermaoLocal(novoLocal);
          await enqueueOp('create', localIdRef.current, novoLocal);
        }
        await atualizarPendentes();
        localStorage.removeItem(RASCUNHO_KEY(id));
        mostrarToast('Salvo offline — sincronizará quando conectar', 'offline');
        setTimeout(() => navigate('/'), 1500);
      }

    } catch (error) {
      mostrarToast('Erro ao salvar: ' + error.message, 'erro');
    } finally {
      setLoading(false);
    }
  }

  const restaurarVersao = (versao) => {
    setConteudo(versao.conteudo);
    setTitulo(versao.titulo);
    setReferencia(versao.referencia);
    setMostrarHistorico(false);
    mostrarToast('Versão anterior restaurada!', 'info');
  };

  const formatarHora = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ── Bloqueio de criação no limite ──────────────────────────────────────────
  if (!id && !podeCreiarSermao) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center gap-5">
        <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center">
          <Lock size={28} className="text-[#5B2DFF]" />
        </div>
        <div>
          <h2 className="font-black text-xl text-slate-800 mb-2">Limite de sermões atingido</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            O plano gratuito permite até 50 sermões salvos. Faça upgrade para ter sermões ilimitados.
          </p>
        </div>
        <button onClick={() => navigate('/upgrade?motivo=limite_sermoes')}
          className="bg-[#5B2DFF] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-[#4a22e0] active:scale-95 transition-all">
          Ver planos
        </button>
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className={`bg-white flex flex-col transition-all duration-300 ${telaCheia ? 'fixed inset-0 z-[150]' : 'min-h-screen'}`}>

      <Toast visivel={toast.visivel} tipo={toast.tipo} mensagem={toast.mensagem}
        onFechar={() => setToast(t => ({ ...t, visivel: false }))} />

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-slate-700 transition-colors p-1">
          <ArrowLeft size={22} />
        </button>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-sm font-black bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent uppercase tracking-widest">
            {id ? 'Editar Mensagem' : 'Novo Sermão'}
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-1 text-amber-500">
              <WifiOff size={10} />
              <span className="text-[9px] font-black uppercase tracking-widest">Offline</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setTelaCheia(t => !t)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
            {telaCheia ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {historico.length > 0 && (
            <button onClick={() => setMostrarHistorico(true)} className="p-2 text-slate-300 hover:text-[#5B2DFF] transition-colors">
              <RotateCcw size={18} />
            </button>
          )}
          <button onClick={salvar} disabled={loading}
            className="bg-[#5B2DFF] text-white p-3 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 hover:bg-[#4a22e0] transition-all">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </button>
        </div>
      </div>

      {/* Título e referência */}
      <div className="px-6 pt-5 shrink-0">
        <input type="text" placeholder="Título da pregação..."
          className="w-full text-2xl font-black border-none outline-none mb-3 placeholder:text-gray-200 focus:ring-0 text-slate-800"
          value={titulo} onChange={e => setTitulo(e.target.value)} />

        {/* ── Indicador de tipo guiado ── */}
        {tipo && !id && (                                    // ← NOVO
          <p className="text-[11px] text-[#5B2DFF] font-bold mb-2">
            Estrutura pronta para{' '}
            {tipo === 'expositivo' ? 'sermão expositivo'
              : tipo === 'tematico' ? 'sermão temático'
              : 'devocional'}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4 text-[#5B2DFF] bg-purple-50 p-3 rounded-2xl">
          <Book size={16} />
          <input type="text" placeholder="Referência Bíblica (ex: João 3:16)"
            className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
            value={referencia} onChange={e => setReferencia(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 mb-3 p-1 bg-slate-50 rounded-xl border border-slate-100 w-fit">
          <button onClick={() => aplicarFormatacao('**', '**')} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Negrito"><Bold size={16} /></button>
          <button onClick={() => aplicarFormatacao('*', '*')}   className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Itálico"><Italic size={16} /></button>
          <button onClick={() => aplicarFormatacao('> ', '')}   className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Citação"><Quote size={16} /></button>
          <button onClick={() => aplicarFormatacao('==', '==')} className="p-2 hover:bg-purple-100 text-purple-500 rounded-lg transition-all" title="Destaque"><Highlighter size={16} /></button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 px-6 overflow-hidden">
        <textarea ref={textAreaRef}
          placeholder={                                      // ← NOVO placeholder inteligente
            tipo === 'expositivo'
              ? 'Desenvolva o texto bíblico aqui...'
              : tipo === 'tematico'
              ? 'Desenvolva o tema aqui...'
              : tipo === 'devocional'
              ? 'Escreva sua reflexão...'
              : 'Escreva a mensagem aqui...'
          }
          className="w-full h-full border-none outline-none resize-none text-slate-700 leading-relaxed text-base focus:ring-0 pb-4"
          style={{ minHeight: '60vh' }}                     // ← NOVO altura dinâmica melhor para iOS
          value={conteudo} onChange={e => setConteudo(e.target.value)} />
      </div>

      {/* Rodapé */}
      <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <AlignLeft size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">{metricas.palavras} palavras</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">~{metricas.minutos} min</span>
          </div>
        </div>

        {!isPlus && sermoesRestantes !== null && sermoesRestantes <= 10 && (
          <button onClick={() => navigate('/upgrade?motivo=limite_sermoes')} className="flex items-center gap-1.5 text-amber-500">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentualUso}%` }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">{sermoesRestantes} restantes</span>
          </button>
        )}

        <div className={`flex items-center gap-1.5 transition-opacity duration-500 ${autoSaveAtivo ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Rascunho salvo</span>
        </div>
      </div>

      {/* Modal histórico — inalterado */}
      {mostrarHistorico && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarHistorico(false)} />
          <div className="relative bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <RotateCcw size={14} className="text-[#5B2DFF]" /> Histórico de Versões
              </h3>
              <button onClick={() => setMostrarHistorico(false)} className="p-1 text-slate-300 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {historico.map((versao, i) => (
                <button key={i} onClick={() => restaurarVersao(versao)} className="w-full p-5 text-left hover:bg-purple-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate">{versao.titulo || 'Sem título'}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{versao.conteudo?.substring(0, 80)}...</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[9px] font-black text-slate-300 uppercase block">{formatarHora(versao.savedAt)}</span>
                      <span className="text-[9px] text-[#5B2DFF] font-bold mt-1 block">Restaurar →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[9px] text-slate-300 text-center font-bold uppercase tracking-widest">Versões salvas localmente · Últimas 5</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;