import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Book } from 'lucide-react';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');

  useEffect(() => {
    if (id) fetchSermao();
  }, [id]);

  async function fetchSermao() {
    const { data } = await supabase.from('sermoes').select('*').eq('id', id).single();
    if (data) {
      setTitulo(data.titulo);
      setConteudo(data.conteudo);
      setReferencia(data.referencia_biblica);
    }
  }

  async function salvar() {
    const dados = { titulo, conteudo, referencia_biblica: referencia };
    const { error } = id 
      ? await supabase.from('sermoes').update(dados).eq('id', id)
      : await supabase.from('sermoes').insert([dados]);

    if (!error) navigate('/');
  }

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-[#5B2DFF]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent">
          {id ? 'EDITAR SERMÃO' : 'NOVO SERMÃO'}
        </h1>
        <button onClick={salvar} className="bg-[#5B2DFF] text-white p-2 rounded-lg shadow-md hover:bg-[#3A1DB8]">
          <Save size={20} />
        </button>
      </div>

      <input 
        type="text" 
        placeholder="Título da Mensagem" 
        className="w-full text-2xl font-bold border-none outline-none mb-2 placeholder:text-gray-200"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      
      <div className="flex items-center gap-2 mb-6 text-[#5B2DFF]">
        <Book size={16} />
        <input 
          type="text" 
          placeholder="Referência (ex: João 3:16)" 
          className="text-sm font-medium border-none outline-none w-full"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      </div>

      <textarea 
        placeholder="Comece a escrever a revelação..." 
        className="w-full h-[60vh] border-none outline-none resize-none text-gray-700 leading-relaxed text-lg"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />
    </div>
  );
};

export default Editor;