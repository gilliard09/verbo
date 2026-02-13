import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
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

  const cores = {
    light: 'bg-[#FDFDFF] text-slate-900',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]',
    dark: 'bg-slate-950 text-slate-100'
  };

  if (!sermao) return <div className="p-10 text-center font-bold">Carregando...</div>;

  return (
    <div className={`min-h-screen transition-all duration-500 ${cores[tema]}`}>
      {/* Barra de Ferramentas Fixa */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-inherit border-b border-black/5 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full">
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-4 bg-black/10 p-2 rounded-2xl">
          {/* BOTÃO DE DIMINUIR (MENOS) */}
          <button 
            onClick={() => setFontSize(f => Math.max(f - 2, 14))}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-xl active:scale-90 transition-all"
            title="Diminuir fonte"
          >
            <Minus size={20} />
          </button>

          {/* INDICADOR DE TAMANHO */}
          <div className="flex items-center gap-1 opacity-50 px-2">
            <Type size={16} />
            <span className="text-xs font-bold">{fontSize}</span>
          </div>

          {/* BOTÃO DE AUMENTAR (MAIS) */}
          <button 
            onClick={() => setFontSize(f => Math.min(f + 2, 50))}
            className="w-10 h-10 flex items-center justify-center hover:bg-black/10 rounded-xl active:scale-90 transition-all"
            title="Aumentar fonte"
          >
            <Plus size={20} />
          </button>

          <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

          {/* BOTÃO DE TEMA */}
          <button 
            onClick={alternarTema} 
            className="flex items-center gap-2 px-4 py-2 hover:bg-black/10 rounded-xl transition-all"
          >
            <Palette size={20} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{tema}</span>
          </button>
        </div>
      </div>

      {/* TEXTO DO SERMÃO */}
      <div className="p-6 max-w-2xl mx-auto pb-32">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4 leading-tight">{sermao.titulo}</h1>
          <span className="px-4 py-1 rounded-full bg-black/5 text-[10px] font-bold uppercase tracking-widest opacity-60">
            {sermao.referencia_biblica}
          </span>
        </header>

        <div 
          style={{ fontSize: `${fontSize}px` }} 
          className="leading-relaxed font-serif whitespace-pre-wrap select-none"
        >
          {sermao.conteudo}
        </div>
      </div>
    </div>
  );
};

export default Leitura;