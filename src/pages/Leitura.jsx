import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Type, Palette, Minus, Plus } from 'lucide-react';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [fontSize, setFontSize] = useState(22);
  const [tema, setTema] = useState('light'); // light -> sepia -> dark

  useEffect(() => {
    fetchSermao();
  }, [id]);

  async function fetchSermao() {
    const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
    if (data) setSermao(data);
  }

  // Função para alternar o tema em ciclo
  const alternarTema = () => {
    if (tema === 'light') setTema('sepia');
    else if (tema === 'sepia') setTema('dark');
    else setTema('light');
  };

  const estilosTema = {
    light: 'bg-[#FDFDFF] text-slate-900',
    sepia: 'bg-[#F4ECD8] text-[#5B4636]',
    dark: 'bg-slate-950 text-slate-100'
  };

  if (!sermao) return <div className="p-10 text-center font-bold">Carregando mensagem...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${estilosTema[tema]}`}>
      {/* Barra de Ferramentas Fixa no Topo */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 bg-inherit border-b border-black/5 backdrop-blur-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-black/5 rounded-full"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex items-center gap-2 bg-black/5 p-1 rounded-2xl">
          {/* Controles de Fonte */}
          <button 
            onClick={() => setFontSize(prev => Math.max(prev - 2, 16))}
            className="p-2 hover:bg-black/5 rounded-xl flex items-center gap-1"
          >
            <Minus size={16} /> <Type size={16} />
          </button>
          
          <div className="w-[1px] h-4 bg-black/10"></div>

          <button 
            onClick={() => setFontSize(prev => Math.min(prev + 2, 48))}
            className="p-2 hover:bg-black/5 rounded-xl flex items-center gap-1"
          >
            <Type size={20} /> <Plus size={16} />
          </button>

          <div className="w-[1px] h-4 bg-black/10"></div>

          {/* Botão Único de Tema */}
          <button 
            onClick={alternarTema}
            className="p-2 hover:bg-black/5 rounded-xl flex items-center gap-2 px-4"
          >
            <Palette size={20} />
            <span className="text-[10px] font-bold uppercase">{tema}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Pregação */}
      <div className="p-6 max-w-3xl mx-auto pb-32">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black mb-4 leading-tight">{sermao.titulo}</h1>
          <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${tema === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}>
            {sermao.referencia_biblica}
          </div>
        </header>

        <div 
          style={{ fontSize: `${fontSize}px` }} 
          className="leading-relaxed whitespace-pre-wrap font-serif"
        >
          {sermao.conteudo}
        </div>
      </div>

      {/* Indicador de Leitura no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 p-4 text-center opacity-30 text-[10px] font-bold pointer-events-none">
        MODO PÚLPITO ATIVO • VERBO
      </div>
    </div>
  );
};

export default Leitura;