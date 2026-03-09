import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Type, Palette, Minus, Plus, Maximize2, Minimize2, WifiOff } from 'lucide-react';
import { salvarOffline, buscarOffline } from '../hooks/useOfflineSermons';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [fontSize, setFontSize] = useState(22);
  const [tema, setTema] = useState('light');
  const [fonte, setFonte] = useState('serif');
  const [modoFoco, setModoFoco] = useState(false);

  // --- Wake Lock ---
  const wakeLockRef = useRef(null);
  const [wakeLockAtivo, setWakeLockAtivo] = useState(false);

  // --- Progresso de leitura ---
  const [progresso, setProgresso] = useState(0);
  const conteudoRef = useRef(null);

  // --- Offline ---
  const [modoOffline, setModoOffline] = useState(false);

  // ─── Wake Lock: ativa ao montar, libera ao desmontar ───────────────────────
  const ativarWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockAtivo(true);
      wakeLockRef.current.addEventListener('release', () => {
        setWakeLockAtivo(false);
      });
    } catch (err) {
      console.warn('Wake Lock não disponível:', err);
    }
  }, []);

  const liberarWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockAtivo(false);
    }
  }, []);

  // Ativa ao entrar na tela
  useEffect(() => {
    ativarWakeLock();
    return () => { liberarWakeLock(); };
  }, [ativarWakeLock, liberarWakeLock]);

  // Reativa se o usuário sair e voltar à aba (ex: minimizou e voltou)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        await ativarWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [ativarWakeLock]);

  // ─── Progresso de leitura via scroll ───────────────────────────────────────
  useEffect(() => {
    const calcularProgresso = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgresso(100);
        return;
      }
      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      setProgresso(pct);
    };

    window.addEventListener('scroll', calcularProgresso, { passive: true });
    calcularProgresso(); // calcula no mount
    return () => window.removeEventListener('scroll', calcularProgresso);
  }, [sermao]);

  // ─── Fetch do sermão (online + fallback offline) ───────────────────────────
  useEffect(() => {
    const fetchSermao = async () => {
      try {
        const { data, error } = await supabase.from('sermoes').select('*').eq('id', id).single();
        if (data) {
          setSermao(data);
          setModoOffline(false);
          // Salva automaticamente no IndexedDB ao abrir online
          salvarOffline(data).catch(() => {});
        } else {
          throw error;
        }
      } catch {
        // Sem internet — tenta buscar do cache local
        const cache = await buscarOffline(id);
        if (cache) {
          setSermao(cache);
          setModoOffline(true);
        }
      }
    };
    fetchSermao();
  }, [id]);

  // ─── Renderização de conteúdo ──────────────────────────────────────────────
  const renderizarConteudo = (texto) => {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/==(.*?)==/g, (match, p1) => {
        const corDestaque = tema === 'dark' ? 'bg-purple-900/50 text-purple-100' : 'bg-purple-100 text-purple-900';
        return `<span class="px-1 rounded ${corDestaque}">${p1}</span>`;
      })
      .replace(/^> (.*$)/gim, (match, p1) => {
        const corBorda = tema === 'dark' ? 'border-white/20' : 'border-black/10';
        return `<blockquote class="border-l-4 ${corBorda} pl-4 my-4 italic opacity-80">${p1}</blockquote>`;
      });
  };

  const alternarTema = () => {
    const ciclos = { light: 'sepia', sepia: 'dark', dark: 'light' };
    setTema(ciclos[tema]);
  };

  const estilosCores = {
    light: 'bg-[#FDFDFF] text-slate-900',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]',
    dark: 'bg-slate-950 text-slate-100'
  };

  const fontesFamilia = {
    serif: 'font-serif',
    inter: 'font-sans',
    poppins: "'Poppins', sans-serif",
    times: "'Times New Roman', serif"
  };

  // Cor da barra de progresso conforme o tema
  const corBarra = {
    light: 'bg-slate-800',
    sepia: 'bg-[#5B4636]',
    dark: 'bg-purple-400'
  };

  if (!sermao) return <div className="p-10 text-center font-bold">Carregando mensagem...</div>;

  return (
    <div className={`min-h-screen transition-all duration-700 ${estilosCores[tema]}`}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');`}
      </style>

      {/* ── Barra de progresso de leitura (sempre visível, acima de tudo) ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-black/5"
        role="progressbar"
        aria-valuenow={progresso}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-150 ease-out ${corBarra[tema]}`}
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* ── Percentual flutuante no modo foco ── */}
      <div
        className={`fixed top-3 right-4 z-[90] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
          modoFoco ? 'opacity-30' : 'opacity-0 pointer-events-none'
        }`}
      >
        {progresso}%
      </div>

      {/* ── Badge offline ── */}
      {modoOffline && (
        <div className={`fixed top-3 right-10 z-[90] flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-opacity duration-500 ${
          tema === 'dark' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-100 text-slate-400'
        } ${modoFoco ? 'opacity-30' : 'opacity-100'}`}>
          <WifiOff size={10} /> Offline
        </div>
      )}

      {/* ── Indicador de Wake Lock (pontinho discreto) ── */}
      {wakeLockAtivo && (
        <div
          title="Tela protegida contra bloqueio automático"
          className={`fixed top-3 left-4 z-[90] w-2 h-2 rounded-full transition-opacity duration-500 ${
            tema === 'dark' ? 'bg-purple-400' : 'bg-slate-400'
          } ${modoFoco ? 'opacity-30' : 'opacity-60'}`}
        />
      )}

      {/* ── Header de controles ── */}
      <div
        className={`sticky top-[3px] z-50 flex items-center justify-between p-4 bg-inherit border-b border-black/5 backdrop-blur-md transition-all duration-500 ${
          modoFoco ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-black/10 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-3 bg-black/10 p-1.5 rounded-2xl shadow-inner">
          <select
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
            className="bg-transparent text-[10px] font-black uppercase tracking-tighter border-none focus:ring-0 cursor-pointer opacity-60"
          >
            <option value="serif">Padrão</option>
            <option value="inter">Inter</option>
            <option value="poppins">Poppins</option>
            <option value="times">Times</option>
          </select>

          <div className="w-[1px] h-6 bg-black/10 mx-1" />

          <button
            onClick={() => setFontSize(f => Math.max(f - 2, 14))}
            className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl"
          >
            <Minus size={20} />
          </button>
          <div className="flex flex-col items-center px-1">
            <Type size={14} className="opacity-40" />
            <span className="text-[10px] font-bold opacity-60">{fontSize}</span>
          </div>
          <button
            onClick={() => setFontSize(f => Math.min(f + 2, 50))}
            className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl"
          >
            <Plus size={20} />
          </button>

          <div className="w-[1px] h-6 bg-black/10 mx-1" />

          <button
            onClick={alternarTema}
            className="flex flex-col items-center justify-center px-3 py-1 hover:bg-black/5 rounded-xl transition-all"
          >
            <Palette size={18} />
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{tema}</span>
          </button>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div
        ref={conteudoRef}
        className={`p-6 max-w-2xl mx-auto pb-32 transition-all duration-1000 ${modoFoco ? 'pt-10' : 'pt-6'}`}
      >
        <header className="text-center mb-10">
          <h1 className="text-4xl font-black mb-4 leading-tight">{sermao.titulo}</h1>
          <div className="inline-block px-4 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-widest opacity-60">
            {sermao.referencia_biblica}
          </div>
        </header>

        <div
          style={{
            fontSize: `${fontSize}px`,
            fontFamily:
              fonte === 'serif' || fonte === 'inter' ? undefined : fontesFamilia[fonte]
          }}
          className={`leading-relaxed whitespace-pre-wrap text-justify [text-align-last:left] [hyphens:auto] [word-spacing:-0.01em] ${
            fonte === 'serif' ? 'font-serif' : ''
          } ${fonte === 'inter' ? 'font-sans' : ''}`}
          dangerouslySetInnerHTML={{ __html: renderizarConteudo(sermao.conteudo) }}
        />
      </div>

      {/* ── Botão modo foco ── */}
      <button
        onClick={() => setModoFoco(!modoFoco)}
        className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all duration-500 z-[60] ${
          tema === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
        } hover:scale-110 active:scale-95`}
      >
        {modoFoco ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
      </button>

      {/* ── Rodapé discreto ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-4 text-center text-[9px] font-bold pointer-events-none uppercase tracking-widest transition-opacity duration-1000 ${
          modoFoco ? 'opacity-0' : 'opacity-20'
        }`}
      >
        Modo Púlpito • Verbo
      </div>
    </div>
  );
};

export default Leitura;