import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Maximize, Type } from 'lucide-react';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);

  useEffect(() => {
    fetchSermao();
  }, [id]);

  async function fetchSermao() {
    const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
    setSermao(data);
  }

  if (!sermao) return <div className="p-10 text-center">Carregando palavra...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-24 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-4">
           <Type size={20} className="text-gray-300" />
           <Maximize size={20} className="text-gray-300" />
        </div>
      </div>

      <header className="mb-8 border-l-4 border-[#5B2DFF] pl-4">
        <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2">
          {sermao.titulo}
        </h1>
        <p className="text-[#5B2DFF] font-bold text-sm tracking-widest uppercase">
          {sermao.referencia_biblica}
        </p>
      </header>

      <article className="prose prose-slate">
        <div className="text-xl text-gray-800 leading-loose whitespace-pre-wrap font-serif">
          {sermao.conteudo}
        </div>
      </article>

      <div className="mt-20 text-center opacity-20">
        <img src="/logo.png" alt="Logo" className="w-8 h-8 mx-auto grayscale" />
        <p className="text-[10px] mt-2 font-bold">VERBO</p>
      </div>
    </div>
  );
};

export default Leitura;