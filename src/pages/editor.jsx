import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Save, ArrowLeft, Book, Sparkles, Loader2, 
  Bold, Italic, Quote, Highlighter 
} from 'lucide-react'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const textAreaRef = useRef(null); // Ref para manipular a seleção de texto
  
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    if (id) fetchSermao();
  }, [id]);

  async function fetchSermao() {
    try {
      const { data, error } = await supabase.from('sermoes').select('*').eq('id', id).single();
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

  // FUNÇÃO PARA FORMATAR TEXTO SELECIONADO
  const aplicarFormatacao = (prefixo, sufixo) => {
    const el = textAreaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const textoSelecionado = conteudo.substring(start, end);
    
    // Se não houver seleção, apenas insere os símbolos
    const novoTexto = 
      conteudo.substring(0, start) + 
      prefixo + textoSelecionado + sufixo + 
      conteudo.substring(end);

    setConteudo(novoTexto);
    
    // Devolve o foco ao editor
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefixo.length, end + prefixo.length);
    }, 10);
  };

  async function invocarIA() {
    if (!conteudo.trim()) {
      alert("Escreva pelo menos uma ideia para a IA te ajudar!");
      return;
    }
    setLoadingIA(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Você é um assistente de teologia para o Pastor Jeferson. 
      O tema é "${titulo}" e a referência é "${referencia}".
      Continue a pregação com aplicação prática e linguagem acessível.
      Use frases curtas. Texto: ${conteudo}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setConteudo(prev => prev + "\n\n--- Sugestão da IA ---\n" + response.text());
    } catch (error) {
      alert("Erro na IA: Verifique sua chave.");
    } finally {
      setLoadingIA(false);
    }
  }

  async function salvar() {
    if (!titulo.trim()) { alert("Insira um título."); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const dadosSermao = { titulo, conteudo, referencia_biblica: referencia, user_id: user.id };
      let res = id ? await supabase.from('sermoes').update(dadosSermao).eq('id', id) : await supabase.from('sermoes').insert([dadosSermao]);
      if (res.error) throw res.error;
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
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent uppercase">
          {id ? 'Editar Mensagem' : 'Novo Sermão'}
        </h1>
        <button onClick={salvar} disabled={loading} className="bg-[#5B2DFF] text-white p-3 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95">
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
      
      <div className="flex items-center gap-2 mb-4 text-[#5B2DFF] bg-purple-50 p-3 rounded-2xl">
        <Book size={18} />
        <input 
          type="text" 
          placeholder="Referência Bíblica" 
          className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
      </div>

      {/* TOOLBAR DE FORMATAÇÃO DISCRETA */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-slate-50 rounded-xl border border-slate-100 w-fit">
        <button onClick={() => aplicarFormatacao('**', '**')} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all" title="Negrito"><Bold size={18} /></button>
        <button onClick={() => aplicarFormatacao('*', '*')} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all" title="Itálico"><Italic size={18} /></button>
        <button onClick={() => aplicarFormatacao('> ', '')} className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all" title="Citação"><Quote size={18} /></button>
        <button onClick={() => aplicarFormatacao('==', '==')} className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-all" title="Marcador Pastel"><Highlighter size={18} /></button>
      </div>

      <textarea 
        ref={textAreaRef}
        placeholder="Escreva a mensagem..." 
        className="w-full h-[50vh] border-none outline-none resize-none text-slate-700 leading-relaxed text-lg focus:ring-0"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />

      <div className="fixed bottom-28 right-8 flex flex-col items-center gap-2">
        {loadingIA && <span className="text-[10px] font-black uppercase text-[#5B2DFF] animate-pulse">Inspirando...</span>}
        <button 
          onClick={invocarIA} 
          disabled={loadingIA}
          className={`p-4 rounded-full shadow-2xl transition-all ${loadingIA ? 'bg-gray-100 text-gray-400' : 'bg-white border border-purple-100 text-[#5B2DFF]'}`}
        >
          {loadingIA ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
        </button>
      </div>
    </div>
  );
};

export default Editor;