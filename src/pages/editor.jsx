import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Save, ArrowLeft, Book, Loader2,
  Bold, Italic, Quote, Highlighter, CheckCircle2,
  Clock, AlignLeft, RotateCcw, Maximize2, Minimize2,
  AlertTriangle, X, Lock
} from 'lucide-react';

const PALAVRAS_POR_MINUTO = 120;
const AUTO_SAVE_DELAY = 30000;
const RASCUNHO_KEY = (id) => `verbo_rascunho_${id || 'novo'}`;
const HISTORICO_KEY = (id) => `verbo_historico_${id || 'novo'}`;

const Toast = ({ visivel, tipo, mensagem, onFechar }) => (
  <div className={`fixed top-6 left-1/2 z-[200] transition-all duration-400 ${visivel ? '-translate-x-1/2 translate-y-0 opacity-100 scale-100' : '-translate-x-1/2 -translate-y-4 opacity-0 scale-95 pointer-events-none'}`}>
    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-[20px] shadow-2xl border ${tipo === 'sucesso' ? 'bg-green-500 border-green-400 text-white' : tipo === 'erro' ? 'bg-red-500 border-red-400 text-white' : 'bg-slate-900 border-white/10 text-white'}`}>
      {tipo === 'sucesso' && <CheckCircle2 size={16} />}
      {tipo === 'erro' && <AlertTriangle size={16} />}
      <span className="text-xs font-black uppercase tracking-wide">{mensagem}</span>
      <button onClick={onFechar} className="ml-1 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  </div>
);

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const textAreaRef = useRef(null);
  // TODO: ativar quando implementar planos
  const podeCreiarSermao = true;
  const sermoesRestantes = null;
  const isPlus = true;
  const percentualUso = 0;

  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [telaCheia, setTelaCheia] = useState(true);
  const [autoSaveAtivo, setAutoSaveAtivo] = useState(false);
  const autoSaveRef = useRef(null);
  const [historico, setHistorico] = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [toast, setToast] = useState({ visivel: false, tipo: 'info', mensagem: '' });

  const metricas = useMemo(() => {
    const palavras = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;
    const minutos = Math.ceil(palavras / PALAVRAS_POR_MINUTO);
    return { palavras, minutos };
  }, [conteudo]);

  const mostrarToast = useCallback((mensagem, tipo = 'info', duracao = 3000) => {
    setToast({ visivel: true, tipo, mensagem });
    setTimeout(() => setToast(t => ({ ...t, visivel: false })), duracao);
  }, []);

  useEffect(() => {
    if (id) {
      fetchSermao();
    } else {
      const rascunho = localStorage.getItem(RASCUNHO_KEY(null));
      if (rascunho) {
        try {
          const { titulo: t, conteudo: c, referencia: r, savedAt } = JSON.parse(rascunho);
          setTitulo(t || ''); setConteudo(c || ''); setReferencia(r || '');
          const tempo = new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          mostrarToast(`Rascunho recuperado das ${tempo}`, 'info');
        } catch (e) {}
      }
    }
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY(id)) || '[]');
      setHistorico(hist);
    } catch (e) {}
  }, [id]);

  async function fetchSermao() {
    try {
      const { data, error } = await supabase.from('sermoes').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        setTitulo(data.titulo || '');
        setConteudo(data.conteudo || '');
        setReferencia(data.referencia_biblica || '');
      }
    } catch (error) {
      mostrarToast('Erro ao carregar sermão', 'erro');
    }
  }

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

  const aplicarFormatacao = useCallback((prefixo, sufixo) => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selecionado = conteudo.substring(start, end);
    const novo = conteudo.substring(0, start) + prefixo + selecionado + sufixo + conteudo.substring(end);
    setConteudo(novo);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefixo.length, end + prefixo.length);
    }, 10);
  }, [conteudo]);

  async function salvar() {
    if (!titulo.trim()) { mostrarToast('Insira um título para salvar.', 'erro'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const dadosSermao = { titulo, conteudo, referencia_biblica: referencia, user_id: user.id };

      if (id && conteudo.trim()) {
        const novoHistorico = [
          { conteudo, titulo, referencia, savedAt: new Date().toISOString() },
          ...historico.slice(0, 4)
        ];
        localStorage.setItem(HISTORICO_KEY(id), JSON.stringify(novoHistorico));
        setHistorico(novoHistorico);
      }

      const res = id
        ? await supabase.from('sermoes').update(dadosSermao).eq('id', id)
        : await supabase.from('sermoes').insert([dadosSermao]);

      if (res.error) throw res.error;
      localStorage.removeItem(RASCUNHO_KEY(id));
      mostrarToast('Sermão salvo com sucesso!', 'sucesso');
      setTimeout(() => navigate('/'), 1200);
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

  const formatarHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Bloqueio para novo sermão sem id (criação) quando limite atingido
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
        <button
          onClick={() => navigate('/upgrade?motivo=limite_sermoes')}
          className="bg-[#5B2DFF] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-[#4a22e0] active:scale-95 transition-all"
        >
          Ver planos
        </button>
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className={`bg-white flex flex-col transition-all duration-300 ${telaCheia ? 'fixed inset-0 z-[150]' : 'min-h-screen'}`}>

      <Toast visivel={toast.visivel} tipo={toast.tipo} mensagem={toast.mensagem} onFechar={() => setToast(t => ({ ...t, visivel: false }))} />

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-slate-700 transition-colors p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-sm font-black bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent uppercase tracking-widest">
          {id ? 'Editar Mensagem' : 'Novo Sermão'}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setTelaCheia(t => !t)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
            {telaCheia ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {historico.length > 0 && (
            <button onClick={() => setMostrarHistorico(true)} className="p-2 text-slate-300 hover:text-[#5B2DFF] transition-colors" title="Histórico de versões">
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
        <input
          type="text"
          placeholder="Título da pregação..."
          className="w-full text-2xl font-black border-none outline-none mb-3 placeholder:text-gray-200 focus:ring-0 text-slate-800"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
        />
        <div className="flex items-center gap-2 mb-4 text-[#5B2DFF] bg-purple-50 p-3 rounded-2xl">
          <Book size={16} />
          <input
            type="text"
            placeholder="Referência Bíblica (ex: João 3:16)"
            className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
            value={referencia}
            onChange={e => setReferencia(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 mb-3 p-1 bg-slate-50 rounded-xl border border-slate-100 w-fit">
          <button onClick={() => aplicarFormatacao('**', '**')} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Negrito"><Bold size={16} /></button>
          <button onClick={() => aplicarFormatacao('*', '*')} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Itálico"><Italic size={16} /></button>
          <button onClick={() => aplicarFormatacao('> ', '')} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all" title="Citação"><Quote size={16} /></button>
          <button onClick={() => aplicarFormatacao('==', '==')} className="p-2 hover:bg-purple-100 text-purple-500 rounded-lg transition-all" title="Destaque"><Highlighter size={16} /></button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 px-6 overflow-hidden">
        <textarea
          ref={textAreaRef}
          placeholder="Escreva a mensagem aqui..."
          className="w-full h-full border-none outline-none resize-none text-slate-700 leading-relaxed text-base focus:ring-0 pb-4"
          style={{ minHeight: telaCheia ? 'calc(100vh - 280px)' : '45vh' }}
          value={conteudo}
          onChange={e => setConteudo(e.target.value)}
        />
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
        {/* Sermões restantes no plano gratuito */}
        {!isPlus && sermoesRestantes !== null && sermoesRestantes <= 10 && (
          <button
            onClick={() => navigate('/upgrade?motivo=limite_sermoes')}
            className="flex items-center gap-1.5 text-amber-500"
          >
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentualUso}%` }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">
              {sermoesRestantes} restantes
            </span>
          </button>
        )}

        <div className={`flex items-center gap-1.5 transition-opacity duration-500 ${autoSaveAtivo ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Rascunho salvo</span>
        </div>
      </div>

      {/* Modal histórico */}
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