import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Heart, MessageCircle, Copy, Flag, Send,
  Loader2, Check, MoreHorizontal, Trash2, Edit3,
} from 'lucide-react';

// ─── Estilos globais de animação ──────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @keyframes bounceBtn {
      0%   { transform: scale(1); }
      30%  { transform: scale(0.82); }
      60%  { transform: scale(1.18); }
      80%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    @keyframes heartPulse {
      0%   { transform: scale(1); }
      25%  { transform: scale(1.4); }
      50%  { transform: scale(0.9); }
      75%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    @keyframes ripple {
      0%   { transform: scale(0); opacity: 0.35; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes expandInput {
      from { max-height: 44px; }
      to   { max-height: 180px; }
    }
    .bounce-btn     { animation: bounceBtn 0.42s cubic-bezier(.36,.07,.19,.97) both; }
    .heart-pulse    { animation: heartPulse 0.45s cubic-bezier(.36,.07,.19,.97) both; }
    .fade-slide-in  { animation: fadeSlideIn 0.28s ease both; }
    .btn-press:active { transform: scale(0.88); transition: transform 0.1s ease; }
  `}</style>
);

// ─── Hook de tema do sistema ──────────────────────────────────────────────────
const useTheme = () => {
  const [dark, setDark] = useState(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return dark;
};

// ─── Algoritmo de ranking ─────────────────────────────────────────────────────
const calcularScore = (post) => {
  const curtidas          = post.curtidas?.length || 0;
  const comentarios       = post.total_comentarios || 0;
  const compartilhamentos = post.total_compartilhamentos || 0;
  const score = (curtidas * 2) + (comentarios * 5) + (compartilhamentos * 6);
  const horas = (Date.now() - new Date(post.criado_em)) / 1000 / 3600;
  return score / (horas + 2);
};
const ordenarPorScore = (posts) => [...posts].sort((a, b) => calcularScore(b) - calcularScore(a));

// ─── Tempo relativo ───────────────────────────────────────────────────────────
const tempoRelativo = (data) => {
  const diff = Math.floor((Date.now() - new Date(data)) / 1000);
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LogoVerbo = ({ dark }) => (
  <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: dark ? '#1a1a1a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <img src="/logo.png" alt="Verbo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
  </div>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ nome, foto, size = 40 }) => {
  const [imgErro, setImgErro] = useState(false);
  const inicial = (nome || 'P')[0].toUpperCase();
  if (foto && !imgErro) {
    return <img src={foto} alt={nome} onError={() => setImgErro(true)} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="shrink-0 rounded-full flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg, #5B2DFF 0%, #8B5CF6 100%)' }}>
      {inicial}
    </div>
  );
};

// ─── Botão de ação com bounce + ripple ───────────────────────────────────────
const ActionBtn = ({ onClick, children, active, activeColor = '#5B2DFF', isHeart = false, count, textSub }) => {
  const [animKey, setAnimKey] = useState(0);
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    setAnimKey(k => k + 1);
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex items-center gap-1.5 select-none"
      style={{ color: active ? activeColor : textSub, WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Ripple */}
      {ripple && (
        <span style={{
          position: 'absolute', inset: 0, margin: 'auto',
          width: 32, height: 32, borderRadius: '50%',
          background: active ? activeColor : textSub,
          animation: 'ripple 0.5s ease-out forwards',
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}
      <span
        key={animKey}
        className={animKey > 0 ? (isHeart ? 'heart-pulse' : 'bounce-btn') : ''}
        style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}
      >
        {children}
      </span>
      {count > 0 && (
        <span className="text-[13px] font-medium relative z-10" style={{ color: active ? activeColor : textSub }}>
          {count}
        </span>
      )}
    </button>
  );
};

// ─── Modal de report ──────────────────────────────────────────────────────────
const ModalReport = ({ aberto, onConfirmar, onCancelar, loading, dark }) => {
  const [motivo, setMotivo] = useState('');
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar} />
      <div className={`relative rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${dark ? 'bg-[#1c1c1c] border border-white/10' : 'bg-white'}`}>
        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <Flag size={20} className="text-red-500" />
        </div>
        <h3 className={`font-semibold text-center text-base mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>Reportar post</h3>
        <p className={`text-xs text-center mb-4 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Nos diga o motivo para analisarmos.</p>
        <textarea rows={3} placeholder="Descreva o problema (opcional)..." value={motivo} onChange={e => setMotivo(e.target.value)}
          className={`w-full rounded-2xl p-3 text-sm resize-none outline-none mb-4 ${dark ? 'bg-white/5 text-white placeholder-slate-500 border border-white/10' : 'bg-slate-50 text-slate-700 border border-slate-100'}`} />
        <div className="flex gap-3">
          <button onClick={onCancelar} className={`flex-1 py-3 rounded-2xl border font-medium text-sm ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>Cancelar</button>
          <button onClick={() => { onConfirmar(motivo); setMotivo(''); }} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={14} /> : 'Reportar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Menu de ações ────────────────────────────────────────────────────────────
const MenuAcoes = ({ isAutor, dark, onEditar, onExcluir, onReportar }) => {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAberto(v => !v)} className="btn-press p-1.5 rounded-full"
        style={{ color: dark ? '#475569' : '#cbd5e1' }}>
        <MoreHorizontal size={18} />
      </button>
      {aberto && (
        <div className={`absolute right-0 top-8 z-50 rounded-2xl shadow-xl border overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-150 ${dark ? 'bg-[#1c1c1c] border-white/10' : 'bg-white border-slate-100'}`}>
          {isAutor ? (
            <>
              <button onClick={() => { onEditar(); setAberto(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${dark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}>
                <Edit3 size={15} /> Editar
              </button>
              <div className={`h-px mx-3 ${dark ? 'bg-white/5' : 'bg-slate-100'}`} />
              <button onClick={() => { onExcluir(); setAberto(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50/20">
                <Trash2 size={15} /> Excluir
              </button>
            </>
          ) : (
            <button onClick={() => { onReportar(); setAberto(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 ${dark ? 'hover:bg-white/5' : 'hover:bg-red-50'}`}>
              <Flag size={15} /> Reportar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Card de comentário ───────────────────────────────────────────────────────
const ComentarioItem = ({ c, dark }) => {
  const nome = c.profiles?.full_name || c.profiles?.email?.split('@')[0] || 'Pregador';
  const textSub = dark ? '#64748b' : '#94a3b8';
  return (
    <div className="flex gap-3 mb-3 fade-slide-in">
      <Avatar nome={nome} foto={c.profiles?.avatar_url || ''} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-[13px] font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{nome}</span>
          <span className="text-[11px]" style={{ color: textSub }}>{tempoRelativo(c.criado_em)}</span>
        </div>
        <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{c.conteudo}</p>
      </div>
    </div>
  );
};

// ─── Card de post ─────────────────────────────────────────────────────────────
const PostCard = ({ post, userId, dark, onCurtir, onDescurtir, onCopiar, onReport, onNovoComentario, onEditar, onExcluir }) => {
  const [expandido, setExpandido] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [reportando, setReportando] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState(post.conteudo);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const LIMITE = 20;

  const curtido          = post.curtidas?.some(c => c.user_id === userId);
  const totalCurtidas    = post.curtidas?.length || 0;
  const totalComentarios = post.total_comentarios || 0;
  const isAutor          = post.user_id === userId;
  const nomeAutor        = post.profiles?.full_name || post.profiles?.email?.split('@')[0] || 'Pregador';
  const fotoAutor        = post.profiles?.avatar_url || '';

  // Tokens de cor
  const cardBg      = dark ? '#161618' : '#ffffff';
  const cardShadow  = dark
    ? '0 2px 8px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.3)'
    : '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.07)';
  const cardBorder  = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)';
  const textMain    = dark ? '#f1f5f9' : '#1e293b';
  const textSub     = dark ? '#64748b' : '#94a3b8';
  const inputBg     = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const inputBorder = dark ? 'rgba(255,255,255,0.07)' : '#e8edf2';

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const carregarComentarios = async () => {
    setLoadingComentarios(true);
    const { data: coms } = await supabase
      .from('post_comentarios').select('*').eq('post_id', post.id)
      .order('criado_em', { ascending: true }).limit(LIMITE + 1);
    if (!montado.current) return;
    if (coms && coms.length > 0) {
      const temMaisC = coms.length > LIMITE;
      const lista = temMaisC ? coms.slice(0, LIMITE) : coms;
      setTemMais(temMaisC);
      const uids = [...new Set(lista.map(c => c.user_id))];
      const { data: perfis } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', uids);
      if (!montado.current) return;
      const map = Object.fromEntries((perfis || []).map(p => [p.id, p]));
      setComentarios(lista.map(c => ({ ...c, profiles: map[c.user_id] || null })));
    } else { setComentarios([]); setTemMais(false); }
    setLoadingComentarios(false);
  };

  const toggleComentarios = async () => {
    if (!expandido && comentarios.length === 0) await carregarComentarios();
    setExpandido(v => !v);
  };

  const verMais = async () => {
    const { data: coms } = await supabase.from('post_comentarios').select('*').eq('post_id', post.id)
      .order('criado_em', { ascending: true }).range(comentarios.length, comentarios.length + LIMITE - 1);
    if (!montado.current || !coms) return;
    const uids = [...new Set(coms.map(c => c.user_id))];
    const { data: perfis } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', uids);
    if (!montado.current) return;
    const map = Object.fromEntries((perfis || []).map(p => [p.id, p]));
    setComentarios(prev => [...prev, ...coms.map(c => ({ ...c, profiles: map[c.user_id] || null }))]);
    setTemMais(coms.length === LIMITE);
  };

  const enviarComentario = async () => {
    if (!userId || !novoComentario.trim() || enviando) return;
    setEnviando(true);
    const { data, error } = await supabase.from('post_comentarios')
      .insert({ post_id: post.id, user_id: userId, conteudo: novoComentario.trim() }).select('*').single();
    if (!montado.current) return;
    if (!error && data) {
      setComentarios(prev => [...prev, { ...data, profiles: { full_name: nomeAutor, email: null } }]);
      setNovoComentario('');
      onNovoComentario(post.id);
    }
    setEnviando(false);
  };

  const salvarEdicao = async () => {
    if (!userId || !textoEditado.trim() || salvandoEdicao) return;
    setSalvandoEdicao(true);
    const { error } = await supabase.from('posts').update({ conteudo: textoEditado.trim() }).eq('id', post.id);
    if (!montado.current) return;
    if (!error) onEditar(post.id, textoEditado.trim());
    setSalvandoEdicao(false);
    setEditando(false);
  };

  return (
    <>
      <ModalReport aberto={reportando}
        onConfirmar={async (m) => { setReportLoading(true); await onReport(post.id, m); setReportLoading(false); setReportando(false); }}
        onCancelar={() => setReportando(false)} loading={reportLoading} dark={dark} />

      {/* Card com profundidade real */}
      <div className="px-4 py-2 fade-slide-in">
        <div style={{ background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: 20 }}
          className="overflow-hidden transition-shadow duration-300">

          <div className="px-4 pt-4 pb-3">
            {/* HEADER */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar nome={nomeAutor} foto={fotoAutor} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate" style={{ color: '#5B2DFF' }}>{nomeAutor}</p>
                <span className="text-[11px]" style={{ color: textSub }}>{tempoRelativo(post.criado_em)}</span>
              </div>
              <MenuAcoes isAutor={isAutor} dark={dark}
                onEditar={() => { setTextoEditado(post.conteudo); setEditando(true); }}
                onExcluir={() => onExcluir(post.id)}
                onReportar={() => setReportando(true)} />
            </div>

            {/* CONTEÚDO ou EDITOR */}
            {editando ? (
              <div className="mb-3">
                <textarea value={textoEditado} onChange={e => setTextoEditado(e.target.value.slice(0, 500))}
                  rows={3} className="w-full text-sm leading-relaxed resize-none outline-none rounded-2xl p-3"
                  style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: textMain }} autoFocus />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setEditando(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border btn-press ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    Cancelar
                  </button>
                  <button onClick={salvarEdicao} disabled={salvandoEdicao || !textoEditado.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40 btn-press"
                    style={{ background: '#5B2DFF' }}>
                    {salvandoEdicao ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: dark ? '#c8d3e0' : '#374151' }}>
                {post.conteudo}
              </p>
            )}

            {/* AÇÕES — sem barra, flutuantes abaixo do texto */}
            {!editando && (
              <div className="flex items-center gap-5 pb-1">
                {/* Like com heartPulse */}
                <ActionBtn
                  onClick={() => { if (!userId) return; curtido ? onDescurtir(post.id) : onCurtir(post.id); }}
                  active={curtido} activeColor="#5B2DFF" isHeart textSub={textSub} count={totalCurtidas}>
                  <Heart size={20} style={{ fill: curtido ? '#5B2DFF' : 'none', strokeWidth: curtido ? 0 : 1.8 }} />
                </ActionBtn>

                {/* Comentário com bounce */}
                <ActionBtn
                  onClick={toggleComentarios}
                  active={expandido} activeColor="#5B2DFF" textSub={textSub} count={totalComentarios}>
                  <MessageCircle size={20} style={{ strokeWidth: 1.8 }} />
                </ActionBtn>

                {/* Copiar com bounce */}
                <ActionBtn
                  onClick={() => { navigator.clipboard.writeText(post.conteudo); setCopiado(true); setTimeout(() => setCopiado(false), 2000); onCopiar(); }}
                  active={copiado} activeColor="#22c55e" textSub={textSub}>
                  {copiado ? <Check size={20} style={{ strokeWidth: 2 }} /> : <Copy size={20} style={{ strokeWidth: 1.8 }} />}
                </ActionBtn>
              </div>
            )}
          </div>

          {/* COMENTÁRIOS — fundo levemente diferente para criar camada */}
          {expandido && (
            <div className="px-4 pb-4 pt-3 fade-slide-in"
              style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.018)', borderTop: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
              {loadingComentarios ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin" size={18} style={{ color: '#5B2DFF' }} />
                </div>
              ) : (
                <>
                  {comentarios.length === 0 && (
                    <p className="text-[12px] mb-3" style={{ color: textSub }}>Nenhum comentário ainda.</p>
                  )}
                  {comentarios.map(c => <ComentarioItem key={c.id} c={c} dark={dark} />)}
                  {temMais && (
                    <button onClick={verMais} className="text-[12px] mb-3 font-medium btn-press" style={{ color: '#5B2DFF' }}>
                      Ver mais comentários
                    </button>
                  )}
                </>
              )}
              {userId && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar nome={nomeAutor} foto={fotoAutor} size={26} />
                  <div className="flex-1 flex items-center rounded-full px-3 gap-2"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
                    <input type="text" placeholder="Responder..."
                      value={novoComentario}
                      onChange={e => setNovoComentario(e.target.value.slice(0, 300))}
                      onKeyDown={e => e.key === 'Enter' && enviarComentario()}
                      className="flex-1 py-2 text-[13px] bg-transparent outline-none"
                      style={{ color: textMain }} />
                    <button onClick={enviarComentario} disabled={!novoComentario.trim() || enviando}
                      className="btn-press" style={{ color: novoComentario.trim() ? '#5B2DFF' : textSub }}>
                      {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Comunidade = () => {
  const dark = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novoPost, setNovoPost] = useState('');
  const [expandindoInput, setExpandindoInput] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [toast, setToast] = useState('');
  const inputRef = useRef(null);

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  // Fundo neutro estilo Threads/Instagram: cinza muito suave no light, quase preto no dark
  const bg       = dark ? '#0d0d0f' : '#f2f3f5';
  const bgHeader = dark ? 'rgba(13,13,15,0.92)' : 'rgba(242,243,245,0.92)';
  const border   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub  = dark ? '#64748b' : '#94a3b8';

  // Input card tokens
  const inputCardBg     = dark ? '#161618' : '#ffffff';
  const inputCardShadow = dark ? '0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06)';
  const inputCardBorder = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)';
  const inputBg         = dark ? 'rgba(255,255,255,0.04)' : '#f8fafc';
  const inputBorder     = dark ? 'rgba(255,255,255,0.07)' : '#e8edf2';

  const mostrarToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!montado.current) return;
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pregador');
        setUserAvatar(user.user_metadata?.avatar_url || '');
      }
      await carregarPosts();
    };
    init();
  }, []);

  const carregarPosts = async () => {
    setLoading(true);
    setErro(false);
    const { data: postsData, error: postsError } = await supabase
      .from('posts_com_perfil').select('*').eq('deletado', false)
      .order('criado_em', { ascending: false }).limit(40);
    if (!montado.current) return;
    if (postsError || !postsData) { setErro(true); setLoading(false); return; }
    if (postsData.length === 0) { setPosts([]); setLoading(false); return; }

    const postIds  = postsData.map(p => p.id);
    const autorIds = [...new Set(postsData.map(p => p.user_id))];
    const [{ data: curtidas }, { data: comentariosCount }, { data: avatares }] = await Promise.all([
      supabase.from('post_curtidas').select('post_id, user_id').in('post_id', postIds),
      supabase.from('post_comentarios').select('post_id').in('post_id', postIds),
      supabase.from('profiles').select('id, avatar_url').in('id', autorIds),
    ]);
    if (!montado.current) return;

    const avatarMap = Object.fromEntries((avatares || []).map(a => [a.id, a.avatar_url]));
    const postsCompletos = postsData.map(p => ({
      ...p,
      profiles: { full_name: p.full_name, email: p.email, avatar_url: avatarMap[p.user_id] || '' },
      curtidas: (curtidas || []).filter(c => c.post_id === p.id),
      total_comentarios: (comentariosCount || []).filter(c => c.post_id === p.id).length,
      total_compartilhamentos: p.total_compartilhamentos || 0,
    }));
    setPosts(ordenarPorScore(postsCompletos));
    setLoading(false);
  };

  const publicarPost = async () => {
    if (!userId || !novoPost.trim() || enviando) return;
    setEnviando(true);
    const { data, error } = await supabase.from('posts').insert({ user_id: userId, conteudo: novoPost.trim() }).select('*').single();
    if (!montado.current) return;
    if (!error && data) {
      const novo = { ...data, profiles: { full_name: userName, email: null, avatar_url: userAvatar }, curtidas: [], total_comentarios: 0, total_compartilhamentos: 0 };
      setPosts(prev => ordenarPorScore([novo, ...prev]));
      setNovoPost('');
      setExpandindoInput(false);
    }
    setEnviando(false);
  };

  const curtir = async (postId) => {
    if (!userId) return;
    await supabase.from('post_curtidas').insert({ post_id: postId, user_id: userId });
    if (!montado.current) return;
    setPosts(prev => ordenarPorScore(prev.map(p => p.id === postId ? { ...p, curtidas: [...(p.curtidas || []), { user_id: userId }] } : p)));
  };

  const descurtir = async (postId) => {
    if (!userId) return;
    await supabase.from('post_curtidas').delete().eq('post_id', postId).eq('user_id', userId);
    if (!montado.current) return;
    setPosts(prev => ordenarPorScore(prev.map(p => p.id === postId ? { ...p, curtidas: (p.curtidas || []).filter(c => c.user_id !== userId) } : p)));
  };

  const reportar = async (postId, motivo) => {
    if (!userId) return;
    await supabase.from('post_reports').insert({ post_id: postId, user_id: userId, motivo });
    if (!montado.current) return;
    mostrarToast('Post reportado. Obrigado!');
  };

  const editarPost = (postId, novoConteudo) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, conteudo: novoConteudo } : p));
  };

  const excluirPost = async (postId) => {
    if (!userId) return;
    await supabase.from('posts').update({ deletado: true }).eq('id', postId);
    if (!montado.current) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    mostrarToast('Post excluído.');
  };

  const incrementarComentarios = (postId) => {
    setPosts(prev => ordenarPorScore(prev.map(p => p.id === postId ? { ...p, total_comentarios: (p.total_comentarios || 0) + 1 } : p)));
  };

  // Fechar input ao clicar fora
  const inputWrapRef = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (expandindoInput && inputWrapRef.current && !inputWrapRef.current.contains(e.target)) {
        if (!novoPost.trim()) { setExpandindoInput(false); }
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [expandindoInput, novoPost]);

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen pb-28" style={{ background: bg }}>

        {/* Toast */}
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[400] transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="bg-slate-900 text-white text-[13px] font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-white/10">
            <Check size={13} className="text-green-400" /> {toast}
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-center px-4 pt-12 pb-3"
          style={{ background: bgHeader, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${border}` }}>
          <LogoVerbo dark={dark} />
        </header>

        <div className="max-w-lg mx-auto pt-3">

          {/* ── Input mínimo expansível ── */}
          {userId && (
            <div className="px-4 pb-3" ref={inputWrapRef}>
              <div
                style={{ background: inputCardBg, boxShadow: inputCardShadow, border: inputCardBorder, borderRadius: 18 }}
                className="overflow-hidden transition-all duration-300 cursor-text"
                onClick={() => { if (!expandindoInput) { setExpandindoInput(true); setTimeout(() => inputRef.current?.focus(), 50); } }}
              >
                {!expandindoInput ? (
                  /* Estado mínimo — pill compacto */
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar nome={userName} foto={userAvatar} size={32} />
                    <span className="text-[13px] flex-1" style={{ color: textSub }}>
                      O que você está pensando?
                    </span>
                  </div>
                ) : (
                  /* Estado expandido */
                  <div className="px-4 pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar nome={userName} foto={userAvatar} size={34} />
                      <textarea
                        ref={inputRef}
                        rows={3}
                        value={novoPost}
                        onChange={e => setNovoPost(e.target.value.slice(0, 500))}
                        placeholder="O que você está pensando sobre a Palavra?"
                        className="flex-1 bg-transparent text-[14px] resize-none outline-none leading-relaxed"
                        style={{ color: textMain, minHeight: 72 }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5"
                      style={{ borderTop: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                      <span className="text-[11px]" style={{ color: novoPost.length > 450 ? '#ef4444' : textSub }}>
                        {novoPost.length}/500
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandindoInput(false); setNovoPost(''); }}
                          className="text-xs px-3 py-1.5 rounded-full btn-press"
                          style={{ color: textSub, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}>
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); publicarPost(); }}
                          disabled={!novoPost.trim() || enviando}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white btn-press disabled:opacity-40 transition-opacity"
                          style={{ background: '#5B2DFF', boxShadow: '0 4px 12px rgba(91,45,255,0.35)' }}>
                          {enviando ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          {enviando ? 'Publicando...' : 'Publicar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divisor sutil */}
          <div className="px-4 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: dark ? '#334155' : '#cbd5e1' }}>
              Em destaque
            </p>
          </div>

          {/* Feed */}
          {erro ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <span style={{ fontSize: 32 }}>⚠️</span>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>Não foi possível carregar</p>
                <p className="text-sm mb-4" style={{ color: textSub }}>Verifique sua conexão e tente novamente.</p>
                <button onClick={carregarPosts} className="px-5 py-2 rounded-full text-[13px] font-semibold text-white btn-press"
                  style={{ background: '#5B2DFF' }}>
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={26} style={{ color: '#5B2DFF' }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: dark ? 'rgba(91,45,255,0.15)' : '#f0ecff' }}>
                <LogoVerbo dark={dark} />
              </div>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>Seja o primeiro a postar!</p>
                <p className="text-sm" style={{ color: textSub }}>Compartilhe algo com os pregadores.</p>
              </div>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} userId={userId} dark={dark}
                onCurtir={curtir} onDescurtir={descurtir}
                onCopiar={() => mostrarToast('Texto copiado!')}
                onReport={reportar} onNovoComentario={incrementarComentarios}
                onEditar={editarPost} onExcluir={excluirPost} />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Comunidade;