import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Type, Sun, Moon, Coffee } from 'lucide-react';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [fontSize, setFontSize] = useState(20);
  const [tema, setTema] = useState('light'); // light, dark, sepia

  useEffect(() => {
    fetchSermao();
  }, [id]);

  async function fetchSermao() {
    const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
    setSermao(data);
  }

  const bgClasses = {
    light: 'bg-[#FDFDFF] text-gray-800',
    dark: 'bg-slate-900 text-gray-100',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]'
  };

  if (!sermao) return <div className="p-10 text-center">Carregando...</div>;

  return (
    <div className={`min-h-screen p-6 pb-24 transition-colors duration-300 ${bgClasses[tema]}`}>
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)}><ArrowLeft size={24} /></button>
        <div className="flex gap-4 items-center">
          <button onClick={() => setFontSize(prev => Math.min(prev + 2, 32))}><Type size={20} /></button>
          <button onClick={() => setTema('light')} className={tema === 'light' ? 'text-[#5B2DFF]' : ''}><Sun size={20} /></button>
          <button onClick={() => setTema('sepia')} className={tema === 'sepia' ? 'text-[#5B2DFF]' : ''}><Coffee size={20} /></button>
          <button onClick={() => setTema('dark')} className={tema === 'dark' ? 'text-[#5B2DFF]' : ''}><Moon size={20} /></button>
        </div>
      </div>

      <h1 className="text-3xl font-black mb-2">{sermao.titulo}</h1>
      <p className="font-bold text-sm uppercase mb-8 opacity-70">{sermao.referencia_biblica}</p>

      <div style={{ fontSize: `${fontSize}px` }} className="leading-relaxed whitespace-pre-wrap font-serif">
        {sermao.conteudo}
      </div>
    </div>
  );
};

export default Leitura;