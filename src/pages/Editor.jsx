import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Save, ArrowLeft, Book, Sparkles, Loader2 } from 'lucide-react'; // Adicionado Loader2
import { GoogleGenerativeAI } from "@google/generative-ai"; // Importação da IA

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false); // Estado para o carregamento da IA

  // Configuração da IA (Use sua chave do .env)
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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

  // FUNÇÃO DA INTELIGÊNCIA ARTIFICIAL
  async function invocarIA() {
    if (!conteudo.trim()) {
      alert("Escreva pelo menos uma ideia ou versículo para a IA te ajudar!");
      return;
    }

    setLoadingIA(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Você é um assistente de teologia. 
      O tema é "${titulo}" e a referência é "${referencia}".
      Com base no texto abaixo, continue a pregação com uma aplicação prática e 
      uma linguagem acessível/descomplicada, mantendo o tom de conversa real.
      
      Texto atual:
      ${conteudo}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textoSugerido = response.text();

      // Adiciona o texto da IA ao seu conteúdo atual
      setConteudo(prev => prev + "\n\n--- Sugestão da IA ---\n" + textoSugerido);
      
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Não consegui conectar com a IA agora. Verifique sua chave de API.");
    } finally {
      setLoadingIA(false);
    }
  }

  async function salvar() {
    if (!titulo.trim()) {
      alert("Por favor, insira um título.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sessão expirada.");

      const dadosSermao = {
        titulo: titulo,
        conteudo: conteudo,
        referencia_biblica: referencia,
        user_id: user.id
      };

      let result;
      if (id) {
        result = await supabase.from('sermoes').update(dadosSermao).eq('id', id).select();
      } else {
        result = await supabase.from('sermoes').insert([dadosSermao]).select();
      }

      if (result.error) throw result.error;
      alert("✅ Mensagem guardada com sucesso!");
      navigate('/'); 
    } catch (error) {
      console.error("Erro detalhado:", error);
      alert("Erro ao guardar: " + error.message);
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

      {/* BOTÃO FLUTUANTE DA IA CONFIGURADO */}
      <div className="fixed bottom-28 right-8 flex flex-col items-center gap-2">
        {loadingIA && (
          <span className="text-[10px] font-black uppercase text-[#5B2DFF] animate-pulse">
            Pensando...
          </span>
        )}
        <button 
          onClick={invocarIA}
          disabled={loadingIA}
          className={`p-4 rounded-full shadow-2xl transition-all active:scale-90 ${
            loadingIA ? 'bg-gray-100 text-gray-400' : 'bg-white border border-purple-100 text-[#5B2DFF] hover:bg-purple-50'
          }`}
        >
          {loadingIA ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
        </button>
      </div>
    </div>
  );
};

export default Editor;