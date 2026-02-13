import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Book, Sparkles } from 'lucide-react';

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      // 1. Pegamos o ID do utilizador logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Utilizador não autenticado!");

      const dados = { 
        titulo, 
        conteudo, 
        referencia_biblica: referencia,
        user_id: user.id // Garantimos que o ID do dono está aqui
      };

      let error;
      if (id) {
        // Atualizar sermão existente
        const { error: updateError } = await supabase
          .from('sermoes')
          .update(dados)
          .eq('id', id);
        error = updateError;
      } else {
        // Inserir novo sermão
        const { error: insertError } = await supabase
          .from('sermoes')
          .insert([dados]);
        error = insertError;
      }

      if (error) throw error;
      
      alert("Sermão guardado com sucesso!");
      navigate('/');
    } catch (error) {
      alert("Erro ao guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-[#5B2DFF]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent">
          {id ? 'EDITAR MENSAGEM' : 'NOVA REVELAÇÃO'}
        </h1>
        <button 
          onClick={salvar} 
          disabled={loading}
          className="bg-[#5B2DFF] text-white p-3 rounded-2xl shadow-lg shadow-purple-200 hover:bg-[#3A1DB8] disabled:opacity-50"
        >
          <Save size={20} />
        </button>
      </div>

      <input 
        type="text" 
        placeholder="Título do Sermão" 
        className="w-full text-2xl font-black border-none outline-none mb-2 placeholder:text-gray-200 focus:ring-0"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      
      <div className="flex items-center gap-2 mb-6 text-[#5B2DFF] bg-purple-50 p-2 rounded-lg">
        <Book size={16} />
        <input 
          type="text" 
          placeholder="Referência Bíblica (ex: Efésios 6:10)" 
          className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      </div>

      <textarea 
        placeholder="Desenvolva a mensagem aqui..." 
        className="w-full h-[60vh] border-none outline-none resize-none text-gray-700 leading-relaxed text-lg focus:ring-0"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />

      {/* Dica para o Pastor */}
      <div className="fixed bottom-24 right-6">
        <button className="bg-white border border-gray-100 p-3 rounded-full shadow-md text-[#5B2DFF]">
          <Sparkles size={20} />
        </button>
      </div>
    </div>
  );
};

export default Editor;