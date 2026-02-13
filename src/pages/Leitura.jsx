// src/pages/Leitura.jsx
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
    const fetch = async () => {
      const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
      if (data) setSermao(data);
    };
    fetch();
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
    <div className={`min-h-screen transition-all ${cores[tema]}`}>
      <div className="sticky top-0 p-4 flex justify-between items-center bg-inherit border-b border-black/5 z-50">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <div className="flex items-center gap-2 bg-black/5 p-1 rounded-xl">
          <button onClick={() => setFontSize(f => Math.max(f - 2, 16))} className="p-2"><Minus size={16}/></button>
          <button onClick={() => setFontSize(f => Math.min(f + 2, 48))} className="p-2"><Plus size={16}/></button>
          <button onClick={alternarTema} className="p-2 flex items-center gap-2 border-l border-black/10 ml-1">
            <Palette size={18}/> <span className="text-[10px] font-bold uppercase">{tema}</span>
          </button>
        </div>
      </div>
      <div className="p-6 max-w-2xl mx-auto pb-20">
        <h1 className="text-3xl font-black text-center mb-8 leading-tight">{sermao.titulo}</h1>
        <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed font-serif whitespace-pre-wrap">
          {sermao.conteudo}
        </div>
      </div>
    </div>
  );
};

export default Leitura;