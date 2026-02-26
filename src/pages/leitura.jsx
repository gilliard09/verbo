import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// IMPORTANTE: Minus e Plus devem estar aqui
import { ArrowLeft, Type, Palette, Minus, Plus } from 'lucide-react';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [fontSize, setFontSize] = useState(22);
  const [tema, setTema] = useState('light');

  useEffect(() => {
    const fetchSermao = async () => {
      const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
      if (data) setSermao(data);
    };
    fetchSermao();
  }, [id]);

  const alternarTema = () => {
    const ciclos = { light: 'sepia', sepia: 'dark', dark: 'light' };
    setTema(ciclos[tema]);
  };

  const estilosCores = {
    light: 'bg-[#FDFDFF] text-slate-900',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]',
    dark: 'bg-slate-950 text-slate-100'
  };

  if (!sermao) return <div className="p-10 text-center font-bold">Carregando mensagem...</div>;

  return (
    <div className={`min-h-screen transition-all duration-500 ${estilosCores[tema]}`}>
      {/* Barra de Ferramentas Fixa */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-inherit border-b border-black/5 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>

        {/* CONTROLES DE FONTE E TEMA */}
        <div className="flex items-center gap-3 bg-black/10 p-1.5 rounded-2xl shadow-inner">
          
          {/* BOTÃO DE DIMINUIR (-) */}
          <button 
            onClick={() => setFontSize(f => Math.max(f - 2, 14))}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-xl active:scale-90 transition-all shadow-sm"
          >
            <Minus size={20} />
          </button>

          {/* ÍCONE CENTRAL / INDICADOR */}
          <div className="flex flex-col items-center px-1">
            <Type size={14} className="opacity-40" />
            <span className="text-[10px] font-bold opacity-60">{fontSize}</span>
          </div>

          {/* BOTÃO DE AUMENTAR (+) */}
          <button 
            onClick={() => setFontSize(f => Math.min(f + 2, 50))}
            className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-xl active:scale-90 transition-all shadow-sm"
          >
            <Plus size={20} />
          </button>

          <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

          {/* BOTÃO CÍCLICO DE TEMA */}
          <button 
            onClick={alternarTema} 
            className="flex flex-col items-center justify-center px-3 py-1 hover:bg-black/5 rounded-xl transition-all"
          >
            <Palette size={18} />
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{tema}</span>
          </button>
        </div>
      </div>

      {/* TEXTO DO SERMÃO */}
      <div className="p-6 max-w-2xl mx-auto pb-32">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-black mb-4 leading-tight">{sermao.titulo}</h1>
          <div className="inline-block px-4 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-widest opacity-60">
            {sermao.referencia_biblica}
          </div>
        </header>

        <div 
          style={{ fontSize: `${fontSize}px` }} 
          className="leading-relaxed font-serif whitespace-pre-wrap select-none"
        >
          {sermao.conteudo}
        </div>
      </div>

      {/* RODAPÉ DISCRETO */}
      <div className="fixed bottom-0 left-0 right-0 p-4 text-center opacity-20 text-[9px] font-bold pointer-events-none uppercase tracking-widest">
        Modo Púlpito • Verbo
      </div>
    </div>
  );
};

export default Leitura;