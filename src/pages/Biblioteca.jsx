import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, Search, Lock, ChevronRight, Loader2, Plus, X, UploadCloud, Link as LinkIcon } from 'lucide-react';
import LeitorLivro from './LeitorLivro';

const Biblioteca = () => {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [livroSelecionado, setLivroSelecionado] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // Estados para o Modal de Admin
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novoLivro, setNovoLivro] = useState({
    titulo: '',
    autor: 'Pr. Jeferson',
    capa_url: '',
    conteudo: '', // Aqui agora salvaremos a URL do PDF
    preco: 'R$ 9,99',
    link_venda: '',
    adquirido: true
  });

  // E-mail do Pastor Jeferson para liberar o botão de (+)
  const adminEmail = 'jefersonrocha998@gmail.com'; 

  useEffect(() => {
    fetchLivros();
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserEmail(user.email);
  }

  async function fetchLivros() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('livros')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setLivros(data);
    } catch (error) {
      console.error('Erro ao carregar biblioteca:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSalvarLivro = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const { error } = await supabase.from('livros').insert([novoLivro]);
      if (error) throw error;
      
      setShowAdminForm(false);
      // Reset do form
      setNovoLivro({ titulo: '', autor: 'Pr. Jeferson', capa_url: '', conteudo: '', preco: 'R$ 9,99', link_venda: '', adquirido: true });
      fetchLivros();
    } catch (error) {
      alert("Erro ao publicar: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const livrosFiltrados = livros.filter(livro => 
    livro.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    livro.autor.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading && livros.length === 0) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFDFF]">
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  // Se um livro estiver selecionado, exibe o componente do Leitor de PDF
  if (livroSelecionado) {
    return (
      <LeitorLivro 
        livro={livroSelecionado} 
        onVoltar={() => setLivroSelecionado(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32 animate-in fade-in">
      <header className="mt-8 mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Biblioteca</h1>
        <p className="text-gray-400 text-sm font-medium">Sua estante digital da School Tech.</p>
      </header>

      {/* BARRA DE BUSCA */}
      <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3 mb-8 focus-within:ring-2 ring-purple-100 transition-all">
        <Search size={18} className="text-gray-300" />
        <input 
          type="text" 
          placeholder="Buscar ebook..." 
          className="bg-transparent outline-none w-full font-medium text-sm text-slate-600"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* VITRINE DE LIVROS */}
      <div className="grid grid-cols-2 gap-6">
        {livrosFiltrados.map((livro) => (
          <div 
            key={livro.id} 
            onClick={() => livro.adquirido ? setLivroSelecionado(livro) : window.open(livro.link_venda, '_blank')} 
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg transition-transform active:scale-95 group-hover:shadow-purple-100 group-hover:shadow-2xl transition-all">
              <img 
                src={livro.capa_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300'} 
                alt={livro.titulo} 
                className="w-full h-full object-cover" 
              />
              {!livro.adquirido && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                  <Lock className="text-white" size={24} />
                </div>
              )}
            </div>
            <div className="mt-3 px-1">
              <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{livro.titulo}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{livro.preco}</p>
            </div>
          </div>
        ))}
      </div>

      {/* BANNER DO CURSO */}
      <div className="mt-12 bg-gradient-to-br from-[#5B2DFF] to-[#D946EF] rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Aperfeiçoamento</span>
          <h2 className="text-xl font-black mt-1 mb-2">Formação para Pregadores</h2>
          <button 
            onClick={() => window.open('https://pay.hotmart.com/seu-link-curso', '_blank')}
            className="bg-white text-[#5B2DFF] px-6 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all flex items-center gap-2"
          >
            QUERO ME INSCREVER <ChevronRight size={14} />
          </button>
        </div>
        <BookOpen className="absolute right-[-20px] bottom-[-20px] text-white/10 w-40 h-40 -rotate-12 group-hover:scale-110 transition-transform" />
      </div>

      {/* BOTÃO FLUTUANTE ADMIN */}
      {userEmail === adminEmail && (
        <button 
          onClick={() => setShowAdminForm(true)}
          className="fixed bottom-24 right-6 bg-[#5B2DFF] text-white p-4 rounded-full shadow-2xl z-40 active:scale-90 transition-all border-4 border-white"
        >
          <Plus size={24} />
        </button>
      )}

      {/* MODAL DE CADASTRO (ADMIN) */}
      {showAdminForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setShowAdminForm(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><UploadCloud size={24}/></div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-800">Publicar Novo Ebook</h3>
            </div>
            
            <form onSubmit={handleSalvarLivro} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Título do Livro</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white focus:ring-1 ring-purple-200 transition-all" onChange={e => setNovoLivro({...novoLivro, titulo: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Link do PDF (URL do Storage)</label>
                <div className="relative">
                   <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input required placeholder="https://..." className="w-full p-4 pl-10 bg-slate-50 rounded-2xl outline-none text-xs text-blue-600 font-medium" onChange={e => setNovoLivro({...novoLivro, conteudo: e.target.value})} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1 px-2">Suba o PDF no Supabase Storage e cole o link aqui.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Preço Exibido</label>
                  <input placeholder="R$ 9,99" className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-sm font-bold" onChange={e => setNovoLivro({...novoLivro, preco: e.target.value})} />
                </div>
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Status</label>
                  <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-sm font-bold appearance-none cursor-pointer" onChange={e => setNovoLivro({...novoLivro, adquirido: e.target.value === 'true'})}>
                    <option value="true">Liberado</option>
                    <option value="false">Bloqueado (Venda)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Link da Capa (Imagem)</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-xs" placeholder="URL da imagem da capa" onChange={e => setNovoLivro({...novoLivro, capa_url: e.target.value})} />
              </div>

              <button 
                type="submit" 
                disabled={enviando}
                className="w-full py-5 bg-[#5B2DFF] text-white rounded-[28px] font-bold shadow-lg shadow-purple-100 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all disabled:opacity-50"
              >
                {enviando ? <Loader2 className="animate-spin" size={20}/> : 'LANÇAR EBOOK'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblioteca;