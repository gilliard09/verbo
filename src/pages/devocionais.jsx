import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Check, Loader2, Share2, BookOpen, Calendar, Flame, ChevronRight, 
  Instagram, Facebook, MessageCircle, X, Volume2, Pause, Play, Highlighter,
  Heart, MessageSquare, Users, Download, Wifi, WifiOff, ZoomIn, ZoomOut,
  Filter, RotateCcw, Eye, EyeOff, BookmarkCheck
} from 'lucide-react';

// ─── ESTILOS GLOBAIS ──────────────────────────────────────────────────────────
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
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(91,45,255,0.7); }
      50% { box-shadow: 0 0 0 6px rgba(91,45,255,0); }
    }
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .bounce-btn     { animation: bounceBtn 0.42s cubic-bezier(.36,.07,.19,.97) both; }
    .fade-slide-in  { animation: fadeSlideIn 0.28s ease both; }
    .celebrate      { animation: celebrate 0.6s ease-in-out; }
    .pulse-glow     { animation: pulseGlow 2s infinite; }
    .btn-press:active { transform: scale(0.88); transition: transform 0.1s ease; }
    .slide-in-right { animation: slideInRight 0.35s ease-out; }
    .highlight-yellow { background: rgba(255,193,7,0.3); border-left: 3px solid #FFC107; padding-left: 8px; }
    .highlight-pink { background: rgba(236,64,122,0.2); border-left: 3px solid #EC407A; padding-left: 8px; }
    .highlight-blue { background: rgba(33,150,243,0.2); border-left: 3px solid #2196F3; padding-left: 8px; }
    .text-selection {
      user-select: text;
      -webkit-user-select: text;
    }
  `}</style>
);

// ─── HOOK DE TEMA ────────────────────────────────────────────────────────────
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

// ─── HOOK DE CONEXÃO ─────────────────────────────────────────────────────────
const useOnline = () => {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return online;
};

// ─── HOOK DE STORAGE LOCAL (OFFLINE) ─────────────────────────────────────────
const useOfflineStorage = () => {
  const save = async (key, data) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`verbo_${key}`, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  };

  const get = async (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(`verbo_${key}`);
        return data ? JSON.parse(data) : null;
      }
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  };

  return { save, get };
};

// ─── LOGO ────────────────────────────────────────────────────────────────────
const LogoVerbo = ({ dark }) => (
  <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', background: dark ? '#1a1a1a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <img src="/logo.png" alt="Verbo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
  </div>
);

// ─── TEMPO RELATIVO ──────────────────────────────────────────────────────────
const tempoRelativo = (data) => {
  const diff = Math.floor((Date.now() - new Date(data)) / 1000);
  if (diff < 60)     return 'agora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// ─── MODAL DE LEITURA DEDICADA ────────────────────────────────────────────────
const TelaLeitura = ({ devocional, onFechar, dark, completado, onMarcarCompleto, onCompartilhar }) => {
  const [fontSize, setFontSize] = useState(16);
  const [tocandoAudio, setTocandoAudio] = useState(false);
  const [conteudoVersiculo, setConteudoVersiculo] = useState('');
  const [carregandoVersiculo, setCarregandoVersiculo] = useState(false);
  const [versiculoClicado, setVersiculoClicado] = useState(null);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
  if (!versiculoClicado) return;

  const buscarVersiculo = async () => {
    setCarregandoVersiculo(true);
    try {
      // A Bible-API aceita o formato "João 3:16"
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(versiculoClicado)}?translation=almeida`);
      const data = await response.json();
      
      if (data.text) {
        setConteudoVersiculo(data.text);
      } else {
        setConteudoVersiculo('Não foi possível carregar este versículo.');
      }
    } catch (error) {
      setConteudoVersiculo('Erro ao buscar versículo.');
    } finally {
      setCarregandoVersiculo(false);
    }
  };

  buscarVersiculo();
}, [versiculoClicado]);

  // Travar scroll do body enquanto modal estiver aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
  }, [devocional.id]);

  // TTS usando Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!tocandoAudio || !('speechSynthesis' in window)) return;

    const texto = `${devocional.titulo}. ${devocional.versiculo_chave || ''}. ${devocional.conteudo || ''}`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => setTocandoAudio(false);

    return () => { window.speechSynthesis.cancel(); };
  }, [tocandoAudio, devocional]);

  const handleMarcarCompleto = async () => {
    if (marcando) return;
    setMarcando(true);
    await onMarcarCompleto(devocional.id);
    setMarcando(false);
  };

  const extrairVerisiculos = (texto) => {
    const regex = /(\d?\s*[A-Z][a-záéíóú]+\s+\d+[:;]\d+(?:\s*-\s*\d+)?)/g;
    return texto.match(regex) || [];
  };

  const versiculos = extrairVerisiculos(devocional.conteudo || '');

  const bg     = dark ? '#0d0d0f' : '#faf9f7';
  const bgCard = dark ? '#161618' : '#ffffff';
  const textMain = dark ? '#f1f5f9' : '#1a1a1a';
  const textSub  = dark ? '#cbd5e1' : '#6b7280';
  const acento   = '#5B2DFF';

  return (
    // Overlay + container centralizado
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
      {/* Overlay escurece o fundo e fecha ao clicar */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />

      {/* Card central — max-h-[90vh] garante scroll interno sem vazar na tela */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: bg }}
      >

        {/* HEADER — fixo no topo do card */}
        <div
          className="flex-none flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}
        >
          <button onClick={onFechar} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X size={20} style={{ color: textMain }} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ZoomOut size={18} style={{ color: textMain }} />
            </button>
            <span className="text-xs px-2" style={{ color: textSub }}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(22, fontSize + 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ZoomIn size={18} style={{ color: textMain }} />
            </button>

            <button
              onClick={() => setTocandoAudio(!tocandoAudio)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title="Ouvir devocional (TTS)"
            >
              {tocandoAudio ? (
                <Pause size={18} className="text-green-500 animate-pulse" />
              ) : (
                <Volume2 size={18} style={{ color: textMain }} />
              )}
            </button>
          </div>
        </div>

        {/* CONTEÚDO — ocupa todo espaço restante e rola internamente */}
        <div
          className="flex-1 overflow-y-auto px-6 py-8 w-full text-selection"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Data e Badge */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} style={{ color: acento }} />
              <span className="text-xs font-medium" style={{ color: textSub }}>
                {new Date(devocional.data_publicacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              {devocional.destaque_dia && (
                <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,193,7,0.2)', color: '#FFC107' }}>
                  ✨ Destaque do Dia
                </span>
              )}
            </div>
          </div>

          {/* TÍTULO */}
          <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ color: textMain }}>
            {devocional.titulo}
          </h1>

          {/* VERSÍCULO CHAVE */}
          {devocional.versiculo_chave && (
            <div
              className="mb-8 p-5 rounded-2xl border-l-4"
              style={{
                background: dark ? 'rgba(91,45,255,0.1)' : 'rgba(91,45,255,0.05)',
                borderColor: acento
              }}
            >
              <p className="text-lg font-semibold italic" style={{ color: acento }}>
                "{devocional.versiculo_chave}"
              </p>
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL */}
          <div className="prose prose-invert max-w-none mb-8">
            <p
              className="leading-relaxed whitespace-pre-line"
              style={{
                color: textMain,
                fontSize: `${fontSize}px`,
                lineHeight: '1.8'
              }}
            >
              {devocional.conteudo}
            </p>
          </div>

          {/* REFLEXÃO */}
          {devocional.reflexao && (
            <div
              className="mb-8 p-6 rounded-2xl border-l-4"
              style={{
                background: dark ? 'rgba(236,64,122,0.08)' : 'rgba(236,64,122,0.06)',
                borderColor: '#EC407A'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} style={{ color: '#EC407A' }} />
                <span className="font-semibold" style={{ color: '#EC407A' }}>Para refletir</span>
              </div>
              <p
                className="leading-relaxed whitespace-pre-line"
                style={{
                  color: textMain,
                  fontSize: `${fontSize - 1}px`
                }}
              >
                {devocional.reflexao}
              </p>
            </div>
          )}

          {/* VERSÍCULOS ENCONTRADOS */}
          {versiculos.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase mb-3" style={{ color: textSub }}>
                Versículos neste devocional
              </p>
              <div className="space-y-2">
                {versiculos.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setVersiculoClicado(v)}
                    className="w-full text-left p-3 rounded-xl border transition hover:border-purple-500/50"
                    style={{
                      background: dark ? '#1a1a1a' : '#f9f9f9',
                      borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                      color: textMain
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: acento }}>{v}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Espaço extra no fim para o conteúdo não ficar colado no rodapé */}
          <div style={{ height: 32 }} />
        </div>

        {/* RODAPÉ — fixo na base do card */}
        <div
          className="flex-none px-6 py-4 border-t"
          style={{
            background: bgCard,
            borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
          }}
        >
          <div className="flex gap-2 w-full">
            <button
              onClick={handleMarcarCompleto}
              disabled={completado || marcando}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all ${
                completado
                  ? dark
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-green-50 text-green-600 border border-green-200'
                  : 'text-white'
              }`}
              style={{
                background: completado ? undefined : acento,
                boxShadow: completado ? 'none' : '0 4px 12px rgba(91,45,255,0.35)'
              }}
            >
              {marcando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : completado ? (
                <><Check size={16} strokeWidth={2.5} /> Completado</>
              ) : (
                <><Check size={16} /> Marcar como completo</>
              )}
            </button>

            <button
              onClick={() => onCompartilhar(devocional)}
              className="px-4 py-3 rounded-xl border transition btn-press"
              style={{
                borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: textMain
              }}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* MODAL DE VERSÍCULO (dentro do card) */}
        {versiculoClicado && (
          <div
            className="absolute inset-0 z-[1001] flex items-end justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setVersiculoClicado(null)}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setVersiculoClicado(null)} />
            <div className={`relative rounded-3xl p-6 w-full max-w-sm shadow-2xl slide-in-right ${dark ? 'bg-[#1c1c1c] border border-white/10' : 'bg-white'}`}>
              <button
                onClick={() => setVersiculoClicado(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={18} style={{ color: textMain }} />
              </button>
              <h3 className="font-bold mb-2 text-lg pr-8" style={{ color: acento }}>{versiculoClicado}</h3>
              <p className="text-sm mb-4" style={{ color: textSub }}>Versículo encontrado neste devocional</p>
              <p className="text-base leading-relaxed mb-4" style={{ color: textMain }}>
                {carregandoVersiculo ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Buscando...</span>
            ) : (
              conteudoVersiculo
              )}
            </p>
              <button
                onClick={() => setVersiculoClicado(null)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white btn-press"
                style={{ background: acento }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MODAL DE COMPARTILHAMENTO ────────────────────────────────────────────────
const ModalCompartilhar = ({ aberto, onFechar, devocional, dark }) => {
  const [copiado, setCopiado] = useState(false);

  if (!aberto) return null;

  const texto = `📖 *${devocional.titulo || 'Devocional'}*\n\n${devocional.versiculo_chave || ''}\n\n${(devocional.conteudo || '').slice(0, 200)}...\n\n🙏 Leia completo no app Verbo`;
  
  const compartilharWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const compartilharInstagram = () => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartilharFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://appverbo.br')}&quote=${encodeURIComponent(texto)}`, '_blank');
  };

  const textSub = dark ? '#64748b' : '#94a3b8';

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className={`relative rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${dark ? 'bg-[#1c1c1c] border border-white/10' : 'bg-white'}`}>
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

// ─── CALENDÁRIO VISUAL DE PROGRESSO ──────────────────────────────────────────
const CalendarioProgresso = ({ completados, dark }) => {
  const [mes, setMes] = useState(new Date());
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub = dark ? '#64748b' : '#94a3b8';
  const acento = '#5B2DFF';

  const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const diasDoMes = [];
  
  for (let i = 0; i < primeiroDia.getDay(); i++) {
    diasDoMes.push(null);
  }
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    diasDoMes.push(i);
  }

  const isConcluido = (dia) => {
    if (!dia) return false;
    const data = new Date(mes.getFullYear(), mes.getMonth(), dia).toDateString();
    return completados.some(c => new Date(c).toDateString() === data);
  };

  return (
    <div className="px-4 py-4">
      <div 
        className="rounded-[24px] p-5"
        style={{
          background: dark 
            ? 'rgba(91,45,255,0.08)' 
            : 'rgba(91,45,255,0.04)',
          border: `1px solid ${dark ? 'rgba(91,45,255,0.2)' : 'rgba(91,45,255,0.15)'}`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: textMain }}>
            {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition text-sm"
              style={{ color: textSub }}
            >
              ←
            </button>
            <button 
              onClick={() => setMes(new Date())}
              className="px-3 py-1 rounded-lg text-xs font-medium transition text-white"
              style={{ background: acento }}
            >
              Hoje
            </button>
            <button 
              onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition text-sm"
              style={{ color: textSub }}
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
            <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: textSub }}>
              {d}
            </div>
          ))}
          {diasDoMes.map((dia, i) => (
            <div
              key={i}
              className="aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition"
              style={{
                background: isConcluido(dia) ? acento : dark ? '#1a1a1a' : '#f5f5f5',
                color: isConcluido(dia) ? 'white' : textSub,
                cursor: 'default'
              }}
            >
              {dia && (isConcluido(dia) ? <Check size={14} strokeWidth={3} /> : dia)}
            </div>
          ))}
        </div>

        <p className="text-xs text-center" style={{ color: textSub }}>
          {completados.length} leituras este mês
        </p>
      </div>
    </div>
  );
};

// ─── CARD DE DEVOCIONAL ───────────────────────────────────────────────────────
const DevocionalCard = ({ devocional, dark, onMarcarCompleto, completado, onCompartilhar, onAbrir, peopleCount }) => {
  const [marcando, setMarcando] = useState(false);

  const cardBg = dark ? '#161618' : '#ffffff';
  const cardShadow = dark
    ? '0 2px 8px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.3)'
    : '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.07)';
  const cardBorder = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)';
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub = dark ? '#64748b' : '#94a3b8';
  const acento = '#5B2DFF';

  const handleMarcarCompleto = async () => {
    if (marcando) return;
    setMarcando(true);
    await onMarcarCompleto(devocional.id);
    setMarcando(false);
  };

  const titulo = devocional.titulo || 'Devocional';
  const versiculo = devocional.versiculo_chave || '';
  const conteudo = devocional.conteudo || devocional.texto || '';
  const dataPublicacao = devocional.data_publicacao || devocional.data_criacao || new Date();

  return (
    <div className="px-4 py-2 fade-slide-in">
      <div 
        style={{ background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: 20 }}
        className="overflow-hidden transition-shadow duration-300 hover:shadow-lg cursor-pointer group"
        onClick={() => onAbrir(devocional)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} style={{ color: acento }} />
                <span className="text-[11px] font-medium" style={{ color: textSub }}>
                  {new Date(dataPublicacao).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'short'
                  })}
                </span>
                {devocional.destaque_dia && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(255,193,7,0.15)', color: '#FFC107' }}>
                    ✨ Destaque
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold leading-tight mb-1" style={{ color: textMain }}>
                {titulo}
              </h3>
              {versiculo && (
                <p className="text-[12px] font-medium" style={{ color: acento }}>
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

          {conteudo && (
            <div className="mb-4">
              <p 
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ 
                  color: dark ? '#c8d3e0' : '#374151',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {conteudo}
              </p>
              <p className="text-xs font-medium mt-2 group-hover:underline" style={{ color: acento }}>
                Ler devocional completo →
              </p>
            </div>
          )}

          {peopleCount > 0 && (
            <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: textSub }}>
              <Users size={12} />
              <span>{peopleCount} pessoas leram hoje</span>
            </div>
          )}

          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleMarcarCompleto}
              disabled={completado || marcando}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 btn-press transition-all ${
                completado 
                  ? dark 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-purple-600 text-white'
              }`}
              style={{ 
                background: completado ? undefined : acento,
                boxShadow: completado ? 'none' : '0 4px 12px rgba(91,45,255,0.35)',
                opacity: marcando ? 0.6 : 1
              }}
            >
              {marcando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : completado ? (
                <><Check size={16} strokeWidth={2.5} /> Completado</>
              ) : (
                <><Check size={16} /> Marcar como completo</>
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onCompartilhar(devocional); }}
              className={`px-4 py-3 rounded-2xl border btn-press transition ${
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

// ─── HEADER DE PROGRESSO ──────────────────────────────────────────────────────
const ProgressHeader = ({ totalSemana, completadosSemana, streak, dark }) => {
  const percentual = totalSemana > 0 ? (completadosSemana / totalSemana) * 100 : 0;
  const textMain = dark ? '#f1f5f9' : '#1e293b';
  const textSub = dark ? '#64748b' : '#94a3b8';
  const acento = '#5B2DFF';

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
            <h3 className="text-lg font-bold" style={{ color: textMain }}>Seu progresso</h3>
            <p className="text-xs mt-0.5" style={{ color: textSub }}>Esta semana</p>
          </div>
          {streak > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${streak >= 3 ? 'pulse-glow' : ''}`} style={{ background: 'rgba(255,165,0,0.2)' }}>
              <Flame size={16} className="text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak} dias</span>
            </div>
          )}
        </div>

        <div className="mb-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percentual}%`, background: 'linear-gradient(90deg, #5B2DFF 0%, #8B5CF6 100%)' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textSub }}>{completadosSemana} de {totalSemana} completados</span>
          <span className="text-xs font-semibold" style={{ color: acento }}>{Math.round(percentual)}%</span>
        </div>
      </div>
    </div>
  );
};

// ─── FILTROS DE TEMA ──────────────────────────────────────────────────────────
const FiltrosTema = ({ filtroAtivo, onFiltro, dark }) => {
  const temas = [
    { id: 'todos',    label: 'Todos',      icon: '📚' },
    { id: 'perdao',   label: 'Perdão',     icon: '🕊️' },
    { id: 'fe',       label: 'Fé',         icon: '✨' },
    { id: 'lideranca',label: 'Liderança',  icon: '👑' },
    { id: 'oracao',   label: 'Oração',     icon: '🙏' },
  ];

  const textSub = dark ? '#64748b' : '#94a3b8';
  const acento = '#5B2DFF';

  return (
    <div className="px-4 py-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {temas.map(tema => (
          <button
            key={tema.id}
            onClick={() => onFiltro(tema.id)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2"
            style={{
              background: filtroAtivo === tema.id ? acento : dark ? '#1a1a1a' : '#f5f5f5',
              color: filtroAtivo === tema.id ? 'white' : textSub
            }}
          >
            <span>{tema.icon}</span> {tema.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
const Devocionais = () => {
  const dark = useTheme();
  const online = useOnline();
  const offlineStorage = useOfflineStorage();

  const [devocionais, setDevocionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [userId, setUserId] = useState(null);
  const [completados, setCompletados] = useState([]);
  const [streak, setStreak] = useState(0);
  const [modalCompartilhar, setModalCompartilhar] = useState(null);
  const [telaLeituraAberta, setTelaLeituraAberta] = useState(null);
  const [toast, setToast] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [datosCompletadosHoje, setDatosCompletadosHoje] = useState([]);

  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);

  const bg        = dark ? '#0d0d0f' : '#f2f3f5';
  const bgHeader  = dark ? 'rgba(13,13,15,0.92)' : 'rgba(242,243,245,0.92)';
  const border    = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const textMain  = dark ? '#f1f5f9' : '#1e293b';
  const textSub   = dark ? '#64748b' : '#94a3b8';

  const mostrarToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!montado.current) return;
      if (user) {
        setUserId(user.id);
        await Promise.all([carregarDevocionais(), carregarProgresso(user.id)]);
      } else {
        await carregarDevocionais();
      }
    };
    init();
  }, []);

  const carregarDevocionais = async () => {
    setLoading(true);
    setErro(false);
    try {
      const { data, error } = await supabase
        .from('devocionais')
        .select('*')
        .not('titulo', 'is', null)
        .order('data_publicacao', { ascending: false })
        .limit(30);

      if (!montado.current) return;
      
      if (error || !data) {
        const cached = await offlineStorage.get('devocionais');
        if (cached) setDevocionais(cached);
        else setErro(true);
      } else {
        setDevocionais(data);
        await offlineStorage.save('devocionais', data);
      }
    } catch (e) {
      console.error('Erro ao carregar:', e);
      const cached = await offlineStorage.get('devocionais');
      if (cached) setDevocionais(cached);
      else setErro(true);
    } finally {
      setLoading(false);
    }
  };

  const carregarProgresso = async (uid) => {
    const { data: completadosData } = await supabase
      .from('devocionais_completados')
      .select('devocional_id, completado_em')
      .eq('user_id', uid);

    if (!montado.current) return;
    
    if (completadosData) {
      setCompletados(completadosData.map(c => c.devocional_id));
      setDatosCompletadosHoje(completadosData.map(c => c.completado_em));
      
      const datas = completadosData
        .map(c => new Date(c.completado_em).toDateString())
        .sort().reverse();
      
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
          } else break;
        }
      }
      setStreak(streakAtual);
    }
  };

  const marcarCompleto = async (devocionalId) => {
    if (!userId) return;
    const { error } = await supabase
      .from('devocionais_completados')
      .insert({ user_id: userId, devocional_id: devocionalId, completado_em: new Date().toISOString() });

    if (!montado.current) return;
    if (!error) {
      setCompletados(prev => [...prev, devocionalId]);
      await carregarProgresso(userId);
      mostrarToast('Devocional completado! 🎉');
    }
  };

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const devocionaisSemana = devocionais.filter(d => {
    const dataPub = d.data_publicacao || d.data_criacao;
    return dataPub && new Date(dataPub) >= inicioSemana;
  });

  const completadosSemana = devocionaisSemana.filter(d => completados.includes(d.id)).length;

  const devocionalsFiltrados = filtroAtivo === 'todos'
    ? devocionais
    : devocionais.filter(d => d.tema?.toLowerCase() === filtroAtivo);

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen pb-28" style={{ background: bg }}>

        {!online && (
          <div className="fixed top-0 left-0 right-0 z-[500] px-4 py-3 flex items-center gap-2 text-xs font-medium text-white" style={{ background: '#DC2626' }}>
            <WifiOff size={14} />
            <span>Modo offline - dados podem estar desatualizados</span>
          </div>
        )}

        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[400] transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="bg-slate-900 text-white text-[13px] font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-white/10">
            <Check size={13} className="text-green-400" /> {toast}
          </div>
        </div>

        <ModalCompartilhar 
          aberto={!!modalCompartilhar}
          onFechar={() => setModalCompartilhar(null)}
          devocional={modalCompartilhar || {}}
          dark={dark}
        />

        {telaLeituraAberta && (
          <TelaLeitura
            devocional={telaLeituraAberta}
            onFechar={() => setTelaLeituraAberta(null)}
            dark={dark}
            completado={completados.includes(telaLeituraAberta.id)}
            onMarcarCompleto={marcarCompleto}
            onCompartilhar={setModalCompartilhar}
          />
        )}

        <header 
          className="sticky top-0 z-50 flex items-center justify-between px-4 pt-12 pb-3"
          style={{ background: bgHeader, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${border}` }}
        >
          <LogoVerbo dark={dark} />
          <h1 className="text-lg font-bold" style={{ color: textMain }}>Devocionais</h1>
          <div style={{ width: 40 }} />
        </header>

        <div className="max-w-lg mx-auto pt-3">

          {userId && !loading && devocionaisSemana.length > 0 && (
            <ProgressHeader 
              totalSemana={devocionaisSemana.length}
              completadosSemana={completadosSemana}
              streak={streak}
              dark={dark}
            />
          )}

          {userId && !loading && (
            <CalendarioProgresso completados={datosCompletadosHoje} dark={dark} />
          )}

          <FiltrosTema filtroAtivo={filtroAtivo} onFiltro={setFiltroAtivo} dark={dark} />

          <div className="px-4 pb-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: dark ? '#334155' : '#cbd5e1' }}>
              {filtroAtivo === 'todos' ? 'Devocionais recentes' : `Devocionais: ${filtroAtivo.toUpperCase()}`}
            </p>
          </div>

          {erro ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <span style={{ fontSize: 32 }}>⚠️</span>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>Não foi possível carregar</p>
                <p className="text-sm mb-4" style={{ color: textSub }}>Verifique sua conexão e tente novamente.</p>
                <button onClick={carregarDevocionais} className="px-5 py-2 rounded-full text-[13px] font-semibold text-white btn-press" style={{ background: '#5B2DFF' }}>
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" size={26} style={{ color: '#5B2DFF' }} />
            </div>
          ) : devocionalsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: dark ? 'rgba(91,45,255,0.15)' : '#f0ecff' }}>
                <BookOpen size={24} style={{ color: '#5B2DFF' }} />
              </div>
              <div>
                <p className="font-semibold text-base mb-1" style={{ color: textMain }}>Em breve...</p>
                <p className="text-sm" style={{ color: textSub }}>Novos devocionais nesta categoria serão publicados em breve.</p>
              </div>
            </div>
          ) : (
            devocionalsFiltrados.map(devocional => (
              <DevocionalCard
                key={devocional.id}
                devocional={devocional}
                dark={dark}
                onMarcarCompleto={marcarCompleto}
                completado={completados.includes(devocional.id)}
                onCompartilhar={setModalCompartilhar}
                onAbrir={setTelaLeituraAberta}
                peopleCount={Math.floor(Math.random() * 150) + 20}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Devocionais;