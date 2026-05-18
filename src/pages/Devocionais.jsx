import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Check, Loader2, Share2, BookOpen, Calendar,
  Flame, ChevronRight, Instagram, Facebook, MessageCircle
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
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes celebrate {
      0%, 100% { transform: scale(1) rotate(0deg); }
      25% { transform: scale(1.1) rotate(-5deg); }
      75% { transform: scale(1.1) rotate(5deg); }
    }
    .bounce-btn     { animation: bounceBtn 0.42s cubic-bezier(.36,.07,.19,.97) both; }
    .fade-slide-in  { animation: fadeSlideIn 0.28s ease both; }
    .celebrate      { animation: celebrate 0.6s ease-in-out; }
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

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LogoVerbo = ({ dark }) => (
  <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: dark ? '#1a1a1a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <img src="/logo.png" alt="Verbo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
  </div>
);

// ─── Tempo relativo ───────────────────────────────────────────────────────────
const tempoRelativo = (data) => {
  const diff = Math.floor((Date.now() - new Date(data)) / 1000);
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// ─── Modal de compartilhamento ────────────────────────────────────────────────
const ModalCompartilhar = ({ aberto, onFechar, devocional, dark }) => {
  const [copiado, setCopiado] = useState(false);

  if (!aberto) return null;

  const texto = `📖 *${devocional.titulo || 'Devocional'}*\n\n${devocional.versiculo_chave || ''}\n\n${(devocional.conteudo || '').slice(0, 200)}...\n\n🙏 Leia completo no app Verbo`;
  
  const compartilharWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const compartilharInstagram = () => {
    // Instagram não tem deep link direto, então copiamos o texto
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartilharFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://appverbo.br')}&quote=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className={`relative rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${dark ? 'bg-[#1c1c1c] border border-white/10' : 'bg-white'}`}>
        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <Share2 size={20} className="text-purple-500" />
        </div>
        <h3 className={`font-semibold text-center text-base mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
          Compartilhar reflexão
        </h3>
        <p className={`text-xs text-center mb-6 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Escolha onde deseja compartilhar este devocional
        </p>

        <div className="space-y-3 mb-4">
          <button
            onClick={compartilharWhatsApp}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all btn-press ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'}`}
          >
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <span className="font-medium text-sm">WhatsApp</span>
          </button>

          <button
            onClick={compartilharInstagram}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all btn-press ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-sm block">Instagram Stories</span>
              {copiado && <span className="text-xs text-green-500">✓ Texto copiado!</span>}
            </div>
          </button>

          <button
            onClick={compartilharFacebook}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all btn-press ${dark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'}`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Facebook size={20} className="text-white" />
            </div>
            <span className="font-medium text-sm">Facebook</span>
          </button>
        </div>

        <button
          onClick={onFechar}
          className={`w-full py-3 rounded-2xl border font-medium text-sm ${dark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Card de Devocional ───────────────────────────────────────────────────────
const DevocionalCard = ({ devocional, dark, onMarcarCompleto, completado, onCompartilhar }) => {
  const [expandido, setExpandido] = useState(false);
  const [marcando, setMarcando] = useState(false);

  const cardBg      = dark ? '#161618' : '#ffffff';
  const cardShadow  = dark
    ? '0 2px 8px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.3)'
    : '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.07)';
  const cardBorder  = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)';
  const textMain    = dark ? '#f1f5f9' : '#1e293b';
  const textSub     = dark ? '#64748b' : '#94a3b8';

  const handleMarcarCompleto = async () => {
    if (marcando) return;
    setMarcando(true);
    await onMarcarCompleto(devocional.id);
    setMarcando(false);
  };

  // Garantir que os campos existem
  const titulo = devocional.titulo || 'Devocional';
  const versiculo = devocional.versiculo_chave || '';
  const conteudo = devocional.conteudo || devocional.texto || '';
  const reflexao = devocional.reflexao || '';
  const dataPublicacao = devocional.data_publicacao || devocional.data_criacao || new Date();

  return (
    <div className="px-4 py-2 fade-slide-in">
      <div 
        style={{ background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: 20 }}
        className="overflow-hidden transition-shadow duration-300"
      >
        <div className="p-4">
          {/* HEADER */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} style={{ color: '#5B2DFF' }} />
                <span className="text-[11px] font-medium" style={{ color: textSub }}>
                  {new Date(dataPublicacao).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h3 className="text-base font-bold leading-tight mb-1" style={{ color: textMain }}>
                {titulo}
              </h3>
              {versiculo && (
                <p className="text-[12px] font-medium" style={{ color: '#5B2DFF' }}>
                  {versiculo}
                </p>
              )}
            </div>
            {completado && (
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 celebrate">
                <Check size={16} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* PREVIEW DO CONTEÚDO */}
{conteudo && (
  <div className="mb-4">
    <p 
      className="text-sm leading-relaxed whitespace-pre-line" // <-- ADICIONAR whitespace-pre-line
      style={{ 
        color: dark ? '#c8d3e0' : '#374151',
        display: '-webkit-box',
        WebkitLineClamp: expandido ? 'unset' : 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}
    >
      {conteudo}
    </p>
    {conteudo.length > 200 && (
      <button
        onClick={() => setExpandido(!expandido)}
        className="mt-2 text-xs font-medium flex items-center gap-1 btn-press"
        style={{ color: '#5B2DFF' }}
      >
        {expandido ? 'Ver menos' : 'Continuar lendo'}
        <ChevronRight 
          size={14} 
          className="transition-transform"
          style={{ transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>
    )}
  </div>
)}

          {/* REFLEXÃO (se existir) */}
{reflexao && expandido && (
  <div 
    className="mb-4 p-3 rounded-2xl"
    style={{ 
      background: dark ? 'rgba(91,45,255,0.08)' : 'rgba(91,45,255,0.04)',
      border: `1px solid ${dark ? 'rgba(91,45,255,0.2)' : 'rgba(91,45,255,0.1)'}`
    }}
  >
    <div className="flex items-center gap-2 mb-2">
      <BookOpen size={14} style={{ color: '#5B2DFF' }} />
      <span className="text-xs font-semibold" style={{ color: '#5B2DFF' }}>
        Para refletir
      </span>
    </div>
    <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: textMain }}> {/* <-- ADICIONAR whitespace-pre-line */}
      {reflexao}
    </p>
  </div>
)}

          {/* AÇÕES */}
          <div className="flex gap-2">
            <button
              onClick={handleMarcarCompleto}
              disabled={completado || marcando}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all ${
                completado 
                  ? dark 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-[#5B2DFF] text-white'
              }`}
              style={{ 
                boxShadow: completado ? 'none' : '0 4px 12px rgba(91,45,255,0.35)',
                opacity: marcando ? 0.6 : 1
              }}
            >
              {marcando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : completado ? (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Completado
                </>
              ) : (
                <>
                  <Check size={16} />
                  Marcar como completo
                </>
              )}
            </button>

            <button
              onClick={() => onCompartilhar(devocional)}
              className={`px-4 py-3 rounded-2xl border btn-press ${
                dark 
                  ? 'border-white/10 text-slate-300 hover:bg-white/5' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Header com progresso ─────────────────────────────────────────────────────
const ProgressHeader = ({ totalSemana, completadosSemana, streak, dark }) => {
  const percentual = totalSemana > 0 ? (completadosSemana / totalSemana) * 100 : 0;
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub = dark ? '#64748b' : '#94a3b8';

  return (
    <div className="px-4 py-4">
      <div 
        className="rounded-[24px] p-5"
        style={{
          background: dark 
            ? 'linear-gradient(135deg, rgba(91,45,255,0.15) 0%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(91,45,255,0.08) 0%, rgba(139,92,246,0.05) 100%)',
          border: `1px solid ${dark ? 'rgba(91,45,255,0.2)' : 'rgba(91,45,255,0.15)'}`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: textMain }}>
              Seu progresso
            </h3>
            <p className="text-xs mt-0.5" style={{ color: textSub }}>
              Esta semana
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-orange-500/20">
              <Flame size={16} className="text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak} dias</span>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="mb-2">
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${percentual}%`,
                background: 'linear-gradient(90deg, #5B2DFF 0%, #8B5CF6 100%)'
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textSub }}>
            {completadosSemana} de {totalSemana} completados
          </span>
          <span className="text-xs font-semibold" style={{ color: '#5B2DFF' }}>
            {Math.round(percentual)}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Devocionais = () => {
  const dark = useTheme();
  const [devocionais, setDevocionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [userId, setUserId] = useState(null);
  const [completados, setCompletados] = useState([]);
  const [streak, setStreak] = useState(0);
  const [modalCompartilhar, setModalCompartilhar] = useState(null);
  const [toast, setToast] = useState('');

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const bg       = dark ? '#0d0d0f' : '#f2f3f5';
  const bgHeader = dark ? 'rgba(13,13,15,0.92)' : 'rgba(242,243,245,0.92)';
  const border   = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub  = dark ? '#64748b' : '#94a3b8';

  const mostrarToast = (msg) => { 
    setToast(msg); 
    setTimeout(() => setToast(''), 2500); 
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!montado.current) return;
      if (user) {
        setUserId(user.id);
        await Promise.all([
          carregarDevocionais(),
          carregarProgresso(user.id)
        ]);
      } else {
        await carregarDevocionais();
      }
    };
    init();
  }, []);

  const carregarDevocionais = async () => {
    setLoading(true);
    setErro(false);
    
    const { data, error } = await supabase
      .from('devocionais')
      .select('*')
      .not('titulo', 'is', null) // Apenas devocionais que têm título (do admin)
      .order('data_publicacao', { ascending: false })
      .limit(30);

    if (!montado.current) return;
    
    if (error || !data) {
      setErro(true);
      setLoading(false);
      return;
    }

    setDevocionais(data);
    setLoading(false);
  };

  const carregarProgresso = async (uid) => {
    // Carregar devocionais completados
    const { data: completadosData } = await supabase
      .from('devocionais_completados')
      .select('devocional_id, completado_em')
      .eq('user_id', uid);

    if (!montado.current) return;
    
    if (completadosData) {
      setCompletados(completadosData.map(c => c.devocional_id));
      
      // Calcular streak
      const datas = completadosData
        .map(c => new Date(c.completado_em).toDateString())
        .sort()
        .reverse();
      
      let streakAtual = 0;
      const hoje = new Date().toDateString();
      const ontem = new Date(Date.now() - 86400000).toDateString();
      
      if (datas.includes(hoje) || datas.includes(ontem)) {
        streakAtual = 1;
        let dataEsperada = datas.includes(hoje) 
          ? new Date(Date.now() - 86400000)
          : new Date(Date.now() - 2 * 86400000);
        
        for (let i = 1; i < datas.length; i++) {
          if (datas[i] === dataEsperada.toDateString()) {
            streakAtual++;
            dataEsperada = new Date(dataEsperada - 86400000);
          } else {
            break;
          }
        }
      }
      
      setStreak(streakAtual);
    }
  };

  const marcarCompleto = async (devocionalId) => {
    if (!userId) return;

    const { error } = await supabase
      .from('devocionais_completados')
      .insert({
        user_id: userId,
        devocional_id: devocionalId,
        completado_em: new Date().toISOString()
      });

    if (!montado.current) return;

    if (!error) {
      setCompletados(prev => [...prev, devocionalId]);
      await carregarProgresso(userId);
      mostrarToast('Devocional completado! 🎉');
    }
  };

  // Calcular progresso semanal
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const devocionaisSemana = devocionais.filter(d => {
    const dataPub = d.data_publicacao || d.data_criacao;
    return dataPub && new Date(dataPub) >= inicioSemana;
  });

  const completadosSemana = devocionaisSemana.filter(d => 
    completados.includes(d.id)
  ).length;

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

        {/* Modal de compartilhamento */}
        <ModalCompartilhar 
          aberto={!!modalCompartilhar}
          onFechar={() => setModalCompartilhar(null)}
          devocional={modalCompartilhar || {}}
          dark={dark}
        />

        {/* Header */}
        <header 
          className="sticky top-0 z-50 flex items-center justify-center px-4 pt-12 pb-3"
          style={{ 
            background: bgHeader, 
            backdropFilter: 'blur(20px)', 
            borderBottom: `1px solid ${border}` 
          }}
        >
          <LogoVerbo dark={dark} />
        </header>

        <div className="max-w-lg mx-auto pt-3">

          {/* Header de progresso */}
          {userId && !loading && devocionaisSemana.length > 0 && (
            <ProgressHeader 
              totalSemana={devocionaisSemana.length}
              completadosSemana={completadosSemana}
              streak={streak}
              dark={dark}
            />
          )}

          {/* Título da seção */}
          <div className="px-4 pb-2 pt-2">
            <p 
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: dark ? '#334155' : '#cbd5e1' }}
            >
              Devocionais recentes
            </p>
          </div>

          {/* Feed de devocionais */}
          {erro ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <span style={{ fontSize: 32 }}>⚠️</span>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>
                  Não foi possível carregar
                </p>
                <p className="text-sm mb-4" style={{ color: textSub }}>
                  Verifique sua conexão e tente novamente.
                </p>
                <button 
                  onClick={carregarDevocionais}
                  className="px-5 py-2 rounded-full text-[13px] font-semibold text-white btn-press"
                  style={{ background: '#5B2DFF' }}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={26} style={{ color: '#5B2DFF' }} />
            </div>
          ) : devocionais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <div 
                className="w-14 h-14 rounded-[20px] flex items-center justify-center"
                style={{ background: dark ? 'rgba(91,45,255,0.15)' : '#f0ecff' }}
              >
                <BookOpen size={24} style={{ color: '#5B2DFF' }} />
              </div>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>
                  Em breve...
                </p>
                <p className="text-sm" style={{ color: textSub }}>
                  Novos devocionais serão publicados em breve.
                </p>
              </div>
            </div>
          ) : (
            devocionais.map(devocional => (
              <DevocionalCard
                key={devocional.id}
                devocional={devocional}
                dark={dark}
                onMarcarCompleto={marcarCompleto}
                completado={completados.includes(devocional.id)}
                onCompartilhar={setModalCompartilhar}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Devocionais;