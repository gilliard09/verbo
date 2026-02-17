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
    try {
      const { data, error } = await supabase
        .from('sermoes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setTitulo(data.titulo || '');
        setConteudo(data.conteudo || '');
        setReferencia(data.referencia_biblica || '');
      }
    } catch (error) {
      console.error("Erro ao carregar:", error.message);
    }
  }

  async function salvar() {
    if (!titulo.trim()) {
      alert("Por favor, insira um título.");
      return;
    }

    setLoading(true);
    try {
      // 1. Pegamos o usuário logado (Essencial para o RLS)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      // 2. Montamos o objeto exatamente como as colunas do banco
      const dadosSermao = {
        titulo: titulo,
        conteudo: conteudo,
        referencia_biblica: referencia, // Nome da coluna que criamos via SQL
        user_id: user.id
      };

      let result;

      if (id) {
        // Atualizar sermão existente
        result = await supabase
          .from('sermoes')
          .update(dadosSermao)
          .eq('id', id)
          .select(); // O .select() força o Supabase a confirmar a gravação
      } else {
        // Inserir novo sermão
        result = await supabase
          .from('sermoes')
          .insert([dadosSermao])
          .select();
      }

      if (result.error) throw result.error;

      // Se chegamos aqui, salvou de verdade
      alert("✅ Mensagem guardada com sucesso!");
      navigate('/'); 
      
    } catch (error) {
      console.error("Erro detalhado:", error);
      alert("Erro ao guardar: " + (error.message || "Verifique sua conexão"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ArrowLeft size={24} />
        </button>
        
        <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent uppercase">
          {id ? 'Editar Mensagem' : 'Novo Sermão'}
        </h1>

        <button 
          onClick={salvar} 
          disabled={loading}
          className="bg-[#5B2DFF] text-white p-3 rounded-2xl shadow-lg shadow-purple-200 disabled:opacity-50 transition-transform active:scale-95"
        >
          <Save size={20} />
        </button>
      </div>

      <input 
        type="text" 
        placeholder="Título da pregação..." 
        className="w-full text-3xl font-black border-none outline-none mb-2 placeholder:text-gray-200 focus:ring-0 text-slate-800"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      
      <div className="flex items-center gap-2 mb-8 text-[#5B2DFF] bg-purple-50 p-3 rounded-2xl">
        <Book size={18} />
        <input 
          type="text" 
          placeholder="Referência Bíblica (ex: João 3:16)" 
          className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      </div>

      <textarea 
        placeholder="Escreva a mensagem..." 
        className="w-full h-[55vh] border-none outline-none resize-none text-slate-700 leading-relaxed text-lg focus:ring-0"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />

      <div className="fixed bottom-28 right-8">
        <button className="bg-white border border-purple-100 p-4 rounded-full shadow-xl text-[#5B2DFF]">
          <Sparkles size={24} />
        </button>
      </div>
    </div>
  );
};

export default Editor;