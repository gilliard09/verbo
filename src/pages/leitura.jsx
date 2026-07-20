import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft, Type, Palette, Minus, Plus,
  Maximize2, Minimize2, WifiOff, Highlighter, X, Trash2
} from 'lucide-react';
import { salvarOffline, buscarOffline } from '../hooks/useOfflineSermons';

// ─── CORES ────────────────────────────────────────────────────────────────────
const CORES = {
  amarelo: { bg: 'rgba(253,224,71,0.50)',  borda: '#ca8a04', label: 'Amarelo' },
  azul:    { bg: 'rgba(147,197,253,0.55)', borda: '#2563eb', label: 'Azul'    },
  roxo:    { bg: 'rgba(167,139,250,0.45)', borda: '#6D28D9', label: 'Roxo'    },
};

const LS_KEY = (id) => `verbo_highlights_${id}`;

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao]     = useState(null);
  const [fontSize, setFontSize] = useState(22);
  const [tema, setTema]         = useState('light');
  const [fonte, setFonte]       = useState('serif');
  const [modoFoco, setModoFoco] = useState(false);

  // Wake Lock
  const wakeLockRef             = useRef(null);
  const [wakeLockAtivo, setWakeLockAtivo] = useState(false);

  // Progresso
  const [progresso, setProgresso] = useState(0);
  const conteudoRef               = useRef(null);

  // Offline
  const [modoOffline, setModoOffline] = useState(false);

  // Highlights
  const textoRef                    = useRef(null);
  const [highlights, setHighlights] = useState([]);
  const [corAtiva, setCorAtiva]     = useState('amarelo');
  const [menuPos, setMenuPos]       = useState(null);
  const [painel, setPainel]         = useState(false);
  const jaRestaurado                = useRef(false);

  // ─── ✅ WAKE LOCK CORRIGIDO ────────────────────────────────────────────────
  // Só ativa quando a página está visível; silencia o erro NotAllowedError
  const ativarWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    // ✅ Só pede se a aba está visível
    if (document.visibilityState !== 'visible') return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockAtivo(true);
      wakeLockRef.current.addEventListener('release', () => {
        setWakeLockAtivo(false);
        wakeLockRef.current = null;
      });
    } catch (e) {
      // NotAllowedError é normal (aba em background, baixa bateria, etc.)
      // Silenciar — não precisa logar
    }
  }, []);

  const liberarWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
      setWakeLockAtivo(false);
    }
  }, []);

  useEffect(() => {
    ativarWakeLock();
    return () => { liberarWakeLock(); };
  }, [ativarWakeLock, liberarWakeLock]);

  useEffect(() => {
    const fn = () => {
      if (document.visibilityState === 'visible') ativarWakeLock();
      else liberarWakeLock();
    };
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, [ativarWakeLock, liberarWakeLock]);

  // ─── Progresso de scroll ────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(h <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / h) * 100)));
    };
    window.addEventListener('scroll', calc, { passive: true });
    calc();
    return () => window.removeEventListener('scroll', calc);
  }, [sermao]);

  // ─── Fetch sermão ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSermao = async () => {
      try {
        const { data, error } = await supabase.from('sermoes').select('*').eq('id', id).single();
        if (data) {
          setSermao(data);
          setModoOffline(false);
          salvarOffline(data).catch(() => {});
        } else throw error;
      } catch {
        const c = await buscarOffline(id);
        if (c) { setSermao(c); setModoOffline(true); }
      }
    };
    fetchSermao();
  }, [id]);

  // ─── Carregar highlights salvos ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(LS_KEY(id));
      if (raw) setHighlights(JSON.parse(raw));
    } catch {}
  }, [id]);

  // ─── Persistir highlights ───────────────────────────────────────────────────
  const persistir = useCallback((lista) => {
    setHighlights(lista);
    try { localStorage.setItem(LS_KEY(id), JSON.stringify(lista)); } catch {}
  }, [id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ INJETAR TEXTO NO DOM UMA SÓ VEZ — evita que React destrua os <mark>
  //
  // Em vez de usar dangerouslySetInnerHTML (que re-renderiza e destrói marks),
  // injetamos o HTML diretamente via innerHTML uma única vez após sermao chegar,
  // e nunca mais deixamos o React tocar nesse div.
  // ─────────────────────────────────────────────────────────────────────────────
  const htmlInjetado = useRef(false);

  const renderizarMarkdown = useCallback((texto) => {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/==(.*?)==/g, (_, p1) => {
        const c = tema === 'dark' ? 'bg-purple-900/50 text-purple-100' : 'bg-purple-100 text-purple-900';
        return `<span class="px-1 rounded ${c}">${p1}</span>`;
      })
      .replace(/^> (.*$)/gim, (_, p1) => {
        const b = tema === 'dark' ? 'border-white/20' : 'border-black/10';
        return `<blockquote class="border-l-4 ${b} pl-4 my-4 italic opacity-80">${p1}</blockquote>`;
      });
  }, [tema]);

  // Injeta HTML + restaura highlights quando sermao chega
  useEffect(() => {
    if (!sermao || !textoRef.current || htmlInjetado.current) return;

    // 1. Injeta o HTML uma única vez
    textoRef.current.innerHTML = renderizarMarkdown(sermao.conteudo);
    htmlInjetado.current = true;

    // 2. Restaura highlights salvos no localStorage
    if (highlights.length === 0) return;
    highlights.forEach((h) => {
      if (document.getElementById(h.id)) return;
      const cor = CORES[h.corKey];
      if (!cor) return;
      inserirMarkNoTexto(textoRef.current, h.id, h.corKey, cor, h.texto);
    });
    jaRestaurado.current = true;
  }, [sermao]); // só roda quando sermao chega

  // ─── Helper: criar elemento <mark> ──────────────────────────────────────────
  const criarMark = (hlId, corKey, cor) => {
    const mark = document.createElement('mark');
    mark.id = hlId;
    mark.dataset.hlId = hlId;
    mark.dataset.corKey = corKey;
    mark.style.cssText = `
      background-color:${cor.bg};
      border-bottom:2.5px solid ${cor.borda};
      border-radius:3px;
      padding:1px 2px;
      cursor:pointer;
    `;
    return mark;
  };

  // ─── Helper: inserir mark no primeiro textNode que contém o texto ────────────
  const inserirMarkNoTexto = (container, hlId, corKey, cor, texto) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(texto);
      if (idx === -1) continue;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + texto.length);
      const mark = criarMark(hlId, corKey, cor);
      try { range.surroundContents(mark); } catch {
        const frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
      }
      break;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ DETECTAR SELEÇÃO
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSoltar = useCallback((e) => {
    if (e.target.closest('[data-hl-ui]')) return;

    // pequeno delay para o browser confirmar a seleção (necessário em mobile)
    setTimeout(() => {
      const sel = window.getSelection();
      const texto = sel?.toString().trim();

      if (!texto || texto.length < 1) { setMenuPos(null); return; }
      if (!textoRef.current) { setMenuPos(null); return; }

      let range;
      try { range = sel.getRangeAt(0); } catch { setMenuPos(null); return; }

      if (!textoRef.current.contains(range.commonAncestorContainer)) {
        setMenuPos(null); return;
      }

      const rect = range.getBoundingClientRect();
      const MENU_W = 220;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - MENU_W / 2),
        window.innerWidth - MENU_W - 8
      );

      setMenuPos({ top: rect.top + window.scrollY - 72, left });
    }, 30);
  }, []);

  // ─── Fechar menu ao clicar fora ─────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (e.target.closest('[data-hl-ui]')) return;
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel?.toString().trim()) setMenuPos(null);
      }, 50);
    };
    document.addEventListener('pointerdown', fn);
    return () => document.removeEventListener('pointerdown', fn);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ APLICAR HIGHLIGHT — insere <mark> no DOM, NÃO passa pelo React render
  // ─────────────────────────────────────────────────────────────────────────────
  const aplicarHighlight = useCallback((corKey) => {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) return;

    const texto = sel.toString();
    let range;
    try { range = sel.getRangeAt(0); } catch { return; }

    // Não aplicar dentro de outro <mark>
    const anc = range.commonAncestorContainer;
    const elAnc = anc.nodeType === Node.TEXT_NODE ? anc.parentElement : anc;
    if (elAnc?.closest?.('[data-hl-id]')) {
      sel.removeAllRanges();
      setMenuPos(null);
      return;
    }

    const hlId = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cor  = CORES[corKey];
    const mark = criarMark(hlId, corKey, cor);

    try {
      range.surroundContents(mark);
    } catch {
      const frag = range.extractContents();
      mark.appendChild(frag);
      range.insertNode(mark);
    }

    sel.removeAllRanges();
    setMenuPos(null);
    setCorAtiva(corKey);

    persistir([...highlights, { id: hlId, corKey, texto, ts: new Date().toISOString() }]);
  }, [highlights, persistir]);

  // ─── Remover highlight ──────────────────────────────────────────────────────
  const removerHighlight = useCallback((hlId) => {
    const el = document.getElementById(hlId);
    if (el) {
      const p = el.parentNode;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
      p.normalize();
    }
    persistir(highlights.filter(h => h.id !== hlId));
  }, [highlights, persistir]);

  // ─── Click no texto — checar se clicou num <mark> ──────────────────────────
  const handleClickTexto = useCallback((e) => {
    const mark = e.target.closest('[data-hl-id]');
    if (mark) removerHighlight(mark.dataset.hlId);
  }, [removerHighlight]);

  // ─── Limpar todos ───────────────────────────────────────────────────────────
  const limparTodos = useCallback(() => {
    highlights.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) {
        const p = el.parentNode;
        while (el.firstChild) p.insertBefore(el.firstChild, el);
        p.removeChild(el);
        p.normalize();
      }
    });
    persistir([]);
  }, [highlights, persistir]);

  // ─── Tema ───────────────────────────────────────────────────────────────────
  const alternarTema = () => setTema(t => ({ light: 'sepia', sepia: 'dark', dark: 'light' }[t]));

  const bgTema  = { light: 'bg-[#FDFDFF] text-slate-900', sepia: 'bg-[#F4ECD8] text-[#5B4636]', dark: 'bg-slate-950 text-slate-100' };
  const barTema = { light: 'bg-slate-800', sepia: 'bg-[#5B4636]', dark: 'bg-purple-400' };
  const fontFam = { poppins: "'Poppins', sans-serif", times: "'Times New Roman', serif" };
  const menuBg  = { light: 'bg-white border border-slate-200 shadow-xl', sepia: 'bg-[#EDE0C8] border border-[#c8aa85] shadow-lg', dark: 'bg-slate-800 border border-slate-700 shadow-2xl' };
  const painelBg= { light: 'bg-white border-l border-slate-200', sepia: 'bg-[#EDE0C8] border-l border-[#c8aa85]', dark: 'bg-slate-900 border-l border-slate-700' };
  const txSub   = { light: 'text-slate-500', sepia: 'text-[#7a6248]', dark: 'text-slate-400' };
  const txMain  = { light: 'text-slate-800', sepia: 'text-[#5B4636]', dark: 'text-slate-100' };

  if (!sermao) return <div className="p-10 text-center font-bold text-slate-400">Carregando mensagem...</div>;

  const total = highlights.length;

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${bgTema[tema]}`}
      onMouseUp={handleSoltar}
      onTouchEnd={handleSoltar}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
        [data-hl-id] { cursor: pointer; transition: opacity .15s; }
        [data-hl-id]:hover { opacity: .65; }
        @keyframes hlMenuIn { from { opacity:0; transform:translateY(6px) scale(.97); } to { opacity:1; transform:none; } }
        .hl-menu { animation: hlMenuIn .18s ease-out both; }
        @keyframes painelIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:none; } }
        .hl-painel { animation: painelIn .22s ease-out both; }
      `}</style>

      {/* Barra de progresso */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-black/5" role="progressbar" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full transition-all duration-150 ease-out ${barTema[tema]}`} style={{ width: `${progresso}%` }} />
      </div>

      {/* % modo foco */}
      <div className={`fixed right-4 z-[90] text-[10px] font-bold uppercase tracking-widest transition-all duration-500 ${modoFoco ? 'opacity-30' : 'opacity-0 pointer-events-none'}`} style={{ top: 'calc(env(safe-area-inset-top,0px) + .75rem)' }}>
        {progresso}%
      </div>

      {/* Badge offline */}
      {modoOffline && (
        <div className={`fixed right-10 z-[90] flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${tema === 'dark' ? 'bg-purple-900/60 text-purple-300' : 'bg-slate-100 text-slate-400'} ${modoFoco ? 'opacity-30' : 'opacity-100'}`} style={{ top: 'calc(env(safe-area-inset-top,0px) + .75rem)' }}>
          <WifiOff size={10} /> Offline
        </div>
      )}

      {/* WakeLock dot */}
      {wakeLockAtivo && (
        <div title="Tela protegida" className={`fixed left-4 z-[90] w-2 h-2 rounded-full ${tema === 'dark' ? 'bg-purple-400' : 'bg-slate-400'} ${modoFoco ? 'opacity-30' : 'opacity-60'}`} style={{ top: 'calc(env(safe-area-inset-top,0px) + .75rem)' }} />
      )}

      {/* ── HEADER ── */}
      <div
        className={`sticky top-[3px] z-50 flex flex-wrap items-center justify-between gap-2 p-4 bg-inherit border-b border-black/5 backdrop-blur-md transition-all duration-500 ${modoFoco ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top,0px) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/10 rounded-full transition-colors shrink-0">
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-2 bg-black/10 p-1.5 rounded-2xl shadow-inner overflow-x-auto max-w-full">
          <select value={fonte} onChange={e => setFonte(e.target.value)} className="bg-transparent text-[11px] font-bold uppercase tracking-tighter border-none focus:ring-0 cursor-pointer opacity-70 min-h-[40px] shrink-0">
            <option value="serif">Padrão</option>
            <option value="inter">Inter</option>
            <option value="poppins">Poppins</option>
            <option value="times">Times</option>
          </select>

          <div className="w-px h-6 bg-black/10 mx-0.5 shrink-0" />

          <button onClick={() => setFontSize(f => Math.max(f - 2, 14))} className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/20 rounded-xl active:scale-90 transition-transform"><Minus size={18} /></button>
          <div className="flex flex-col items-center px-1 shrink-0">
            <Type size={14} className="opacity-40" />
            <span className="text-[10px] font-bold opacity-60">{fontSize}</span>
          </div>
          <button onClick={() => setFontSize(f => Math.min(f + 2, 50))} className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/20 rounded-xl active:scale-90 transition-transform"><Plus size={18} /></button>

          <div className="w-px h-6 bg-black/10 mx-0.5 shrink-0" />

          <button onClick={alternarTema} className="flex flex-col items-center justify-center px-3 min-w-[44px] min-h-[44px] hover:bg-black/5 rounded-xl transition-all shrink-0">
            <Palette size={18} />
            <span className="text-[9px] font-bold uppercase tracking-tighter mt-1">{tema}</span>
          </button>

          <div className="w-px h-6 bg-black/10 mx-0.5 shrink-0" />

          <button
            data-hl-ui="true"
            onClick={() => setPainel(v => !v)}
            className={`relative flex flex-col items-center justify-center px-3 min-w-[44px] min-h-[44px] rounded-xl transition-all shrink-0 ${painel ? 'bg-yellow-300/30' : 'hover:bg-black/5'}`}
            title="Marcações"
          >
            <Highlighter size={18} />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-[8px] font-black text-slate-900 rounded-full flex items-center justify-center">
                {total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div ref={conteudoRef} className={`p-6 max-w-2xl mx-auto pb-32 transition-all duration-1000 ${modoFoco ? 'pt-10' : 'pt-6'}`}>
        <header className="text-center mb-10">
          <h1 className="font-black mb-4 leading-tight" style={{ fontSize: 'clamp(1.75rem,6vw,2.25rem)' }}>
            {sermao.titulo}
          </h1>
          <div className="inline-block px-4 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-widest opacity-60">
            {sermao.referencia_biblica}
          </div>
        </header>

        {/*
          ✅ DIV IMUTÁVEL — React nunca re-renderiza esse elemento.
          O innerHTML é injetado uma única vez via useEffect (htmlInjetado.current).
          Highlights são inseridos/removidos diretamente no DOM.
        */}
        <div
          ref={textoRef}
          onClick={handleClickTexto}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: (fonte === 'serif' || fonte === 'inter') ? undefined : fontFam[fonte],
          }}
          className={`leading-relaxed whitespace-pre-wrap text-left break-words [hyphens:auto] select-text ${fonte === 'serif' ? 'font-serif' : ''} ${fonte === 'inter' ? 'font-sans' : ''}`}
          // ✅ SEM dangerouslySetInnerHTML aqui — injetado via useEffect
        />
      </div>

      {/* ── MENU FLUTUANTE DE COR ── */}
      {menuPos && (
        <div
          data-hl-ui="true"
          className={`fixed z-[200] rounded-2xl px-4 py-3 hl-menu ${menuBg[tema]}`}
          style={{ top: menuPos.top, left: menuPos.left, minWidth: 220 }}
        >
          {/* Setinha decorativa */}
          <div className={`absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${tema === 'dark' ? 'bg-slate-800 border-r border-b border-slate-700' : tema === 'sepia' ? 'bg-[#EDE0C8] border-r border-b border-[#c8aa85]' : 'bg-white border-r border-b border-slate-200'}`} />

          <div className="flex items-center gap-3">
            <Highlighter size={14} className={`${txSub[tema]} shrink-0`} />

            {Object.entries(CORES).map(([corKey, cor]) => (
              <button
                key={corKey}
                onClick={() => aplicarHighlight(corKey)}
                title={cor.label}
                className={`w-9 h-9 rounded-xl border-2 transition-all active:scale-90 hover:scale-110 ${corAtiva === corKey ? 'ring-2 ring-offset-1' : ''}`}
                style={{ backgroundColor: cor.bg, borderColor: cor.borda }}
              >
                {corAtiva === corKey && (
                  <div className="w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: cor.borda }} />
                )}
              </button>
            ))}

            <button
              onClick={() => { window.getSelection()?.removeAllRanges(); setMenuPos(null); }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-black/10 ml-auto ${txSub[tema]}`}
            >
              <X size={14} />
            </button>
          </div>

          <p className={`text-[9px] font-bold uppercase tracking-widest mt-2 opacity-40 ${txMain[tema]}`}>
            Escolha a cor • Toque no trecho para remover
          </p>
        </div>
      )}

      {/* ── PAINEL LATERAL ── */}
      {painel && (
        <div
          data-hl-ui="true"
          className={`fixed top-0 right-0 bottom-0 z-[150] w-72 max-w-[88vw] flex flex-col hl-painel shadow-2xl ${painelBg[tema]}`}
          style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}
        >
          <div className={`flex items-center justify-between px-5 py-4 border-b ${tema === 'dark' ? 'border-slate-700' : tema === 'sepia' ? 'border-[#c8aa85]' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Highlighter size={17} style={{ color: CORES.roxo.borda }} />
              <div>
                <p className={`font-black text-sm uppercase tracking-tight ${txMain[tema]}`}>Marcações</p>
                <p className={`text-[10px] ${txSub[tema]}`}>{total} {total === 1 ? 'trecho' : 'trechos'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {total > 0 && (
                <button onClick={() => { if (window.confirm('Remover todas as marcações?')) limparTodos(); }} className="p-2 rounded-xl hover:bg-red-100/60 text-red-400 transition-all" title="Limpar tudo">
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={() => setPainel(false)} className={`p-2 rounded-xl hover:bg-black/10 transition-all ${txMain[tema]}`}>
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {total === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full gap-3 text-center opacity-35 ${txMain[tema]}`}>
                <Highlighter size={32} />
                <p className="text-sm font-bold">Nenhuma marcação</p>
                <p className="text-xs leading-relaxed">Selecione um trecho do texto e escolha uma cor</p>
              </div>
            ) : (
              highlights.map(h => {
                const cor = CORES[h.corKey];
                if (!cor) return null;
                return (
                  <div
                    key={h.id}
                    onClick={() => { const el = document.getElementById(h.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                    className={`relative rounded-2xl p-4 border-l-4 cursor-pointer transition-all group ${tema === 'dark' ? 'bg-slate-800/70 hover:bg-slate-800' : tema === 'sepia' ? 'bg-[#F4ECD8] hover:bg-[#EDE0C8]' : 'bg-slate-50 hover:bg-slate-100'}`}
                    style={{ borderLeftColor: cor.borda }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); removerHighlight(h.id); }}
                      className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 text-red-400"
                    >
                      <X size={12} />
                    </button>

                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full border-2 shrink-0" style={{ backgroundColor: cor.bg, borderColor: cor.borda }} />
                      <span className={`text-[8px] font-black uppercase tracking-widest opacity-50 ${txSub[tema]}`}>{cor.label}</span>
                    </div>

                    <p className={`text-[13px] font-medium leading-relaxed italic line-clamp-3 ${txMain[tema]}`} style={{ background: cor.bg, borderRadius: 4, padding: '3px 7px' }}>
                      "{h.texto}"
                    </p>

                    {h.ts && (
                      <p className={`text-[8px] font-bold mt-2 opacity-30 ${txSub[tema]}`}>
                        {new Date(h.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {total > 0 && (
            <div className={`px-5 py-3 border-t text-center ${tema === 'dark' ? 'border-slate-700' : tema === 'sepia' ? 'border-[#c8aa85]' : 'border-slate-200'}`}>
              <p className={`text-[8px] font-bold uppercase tracking-widest opacity-30 ${txSub[tema]}`}>
                Toque num item para ir até o trecho
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botão modo foco */}
      <button
        onClick={() => setModoFoco(!modoFoco)}
        className={`fixed p-4 rounded-full shadow-2xl transition-all duration-300 z-[60] ${tema === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} hover:scale-110 active:scale-95`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom,0px) + 2rem)',
          right: painel ? 'calc(288px + 1rem)' : 'calc(env(safe-area-inset-right,0px) + 2rem)',
          transition: 'right .25s ease, transform .15s',
        }}
      >
        {modoFoco ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
      </button>

      {/* Rodapé */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 text-center text-[9px] font-bold pointer-events-none uppercase tracking-widest transition-opacity duration-1000 ${modoFoco ? 'opacity-0' : 'opacity-20'}`} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 1rem)' }}>
        Modo Púlpito • Verbo
      </div>
    </div>
  );
};

export default Leitura;