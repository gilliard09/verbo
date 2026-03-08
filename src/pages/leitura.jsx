import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Type, Palette, Minus, Plus, Maximize2, Minimize2 } from 'lucide-react';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [fontSize, setFontSize] = useState(22);
  const [tema, setTema] = useState('light');
  const [fonte, setFonte] = useState('serif');
  const [modoFoco, setModoFoco] = useState(false);

  useEffect(() => {
    const fetchSermao = async () => {
      const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
      if (data) setSermao(data);
    };
    fetchSermao();
  }, [id]);

  // FUNÇÃO PARA TRANSFORMAR O TEXTO COM FORMATAÇÃO EM HTML REAL
  const renderizarConteudo = (texto) => {
    if (!texto) return '';

    return texto
      // Negrito: **texto**
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black">$1</strong>')
      // Itálico: *texto*
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Marcador Pastel: ==texto==
      .replace(/==(.*?)==/g, (match, p1) => {
        const corDestaque = tema === 'dark' ? 'bg-purple-900/50 text-purple-100' : 'bg-purple-100 text-purple-900';
        return `<span class="px-1 rounded ${corDestaque}">${p1}</span>`;
      })
      // Citação: > texto (no início da linha)
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

  if (!sermao) return <div className="p-10 text-center font-bold">Carregando mensagem...</div>;

  return (
    <div className={`min-h-screen transition-all duration-700 ${estilosCores[tema]}`}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');`}
      </style>

      <div className={`sticky top-0 z-50 flex items-center justify-between p-4 bg-inherit border-b border-black/5 backdrop-blur-md transition-all duration-500 ${modoFoco ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
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

          <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

          <button onClick={() => setFontSize(f => Math.max(f - 2, 14))} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl"><Minus size={20} /></button>
          <div className="flex flex-col items-center px-1">
            <Type size={14} className="opacity-40" />
            <span className="text-[10px] font-bold opacity-60">{fontSize}</span>
          </div>
          <button onClick={() => setFontSize(f => Math.min(f + 2, 50))} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl"><Plus size={20} /></button>

          <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

          <button onClick={alternarTema} className="flex flex-col items-center justify-center px-3 py-1 hover:bg-black/5 rounded-xl transition-all">
            <Palette size={18} />
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{tema}</span>
          </button>
        </div>
      </div>

      <div className={`p-6 max-w-2xl mx-auto pb-32 transition-all duration-1000 ${modoFoco ? 'pt-10' : 'pt-6'}`}>
        <header className="text-center mb-10">
          <h1 className="text-4xl font-black mb-4 leading-tight">{sermao.titulo}</h1>
          <div className="inline-block px-4 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-widest opacity-60">
            {sermao.referencia_biblica}
          </div>
        </header>

        {/* ALTERAÇÃO AQUI: Usando dangerouslySetInnerHTML para renderizar o HTML gerado pela função */}
        <div 
          style={{ 
            fontSize: `${fontSize}px`,
            fontFamily: (fonte === 'serif' || fonte === 'inter') ? undefined : fontesFamilia[fonte] 
          }} 
          className={`leading-relaxed whitespace-pre-wrap select-none text-justify ${fonte === 'serif' ? 'font-serif' : ''} ${fonte === 'inter' ? 'font-sans' : ''}`}
          dangerouslySetInnerHTML={{ __html: renderizarConteudo(sermao.conteudo) }}
        />
      </div>

      <button 
        onClick={() => setModoFoco(!modoFoco)}
        className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all duration-500 z-[60] ${tema === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} hover:scale-110 active:scale-95`}
      >
        {modoFoco ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
      </button>

      <div className={`fixed bottom-0 left-0 right-0 p-4 text-center opacity-20 text-[9px] font-bold pointer-events-none uppercase tracking-widest transition-opacity duration-1000 ${modoFoco ? 'opacity-0' : 'opacity-20'}`}>
        Modo Púlpito • Verbo
      </div>
    </div>
  );
};

export default Leitura;