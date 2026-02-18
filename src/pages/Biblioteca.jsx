import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, ExternalLink, Plus, X, UploadCloud, Loader2, DollarSign } from 'lucide-react';

const Biblioteca = () => {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [userEmail, setUserEmail] = useState(null);

  // Estados para o Modal de Admin
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novoLivro, setNovoLivro] = useState({
    titulo: '',
    autor: 'Pr. Jeferson',
    capa_url: '',
    link_venda: '', // URL externa do checkout (Cakto, Hotmart, etc)
    preco: 'R$ 9,99'
  });

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
      console.error('Erro ao carregar vitrine:', error.message);
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
      setNovoLivro({ titulo: '', autor: 'Pr. Jeferson', capa_url: '', link_venda: '', preco: 'R$ 9,99' });
      fetchLivros();
    } catch (error) {
      alert("Erro ao publicar: " + error.message);
    } finally {
      setEnviando(false);
    }
  }

  const livrosFiltrados = livros.filter(livro => 
    livro.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading && livros.length === 0) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFDFF]">
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32 animate-in fade-in duration-500">
      <header className="mt-8 mb-8">
        <h1 className="text-4xl font-inter font-black text-slate-800 tracking-tight">Produtos</h1>
        <p className="text-gray-400 text-sm font-medium">Materiais exclusivos do Pr. Jeferson</p>
      </header>

      {/* BUSCA */}
      <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3 mb-8 focus-within:ring-2 ring-purple-100 transition-all">
        <Search size={18} className="text-gray-300" />
        <input 
          type="text" 
          placeholder="O que você quer estudar hoje?" 
          className="bg-transparent outline-none w-full font-medium text-sm text-slate-600"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* GRADE DE PRODUTOS */}
      <div className="grid grid-cols-2 gap-6">
        {livrosFiltrados.map((livro) => (
          <div 
            key={livro.id} 
            onClick={() => window.open(livro.link_venda, '_blank')} 
            className="group cursor-pointer"
          >
            <div className="relative aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg transition-transform active:scale-95 group-hover:-translate-y-2 transition-all">
              <img 
                src={livro.capa_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300'} 
                alt={livro.titulo} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  Ver Detalhes <ExternalLink size={10} />
                </span>
              </div>
            </div>
            <div className="mt-3 px-1">
              <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{livro.titulo}</h3>
              <p className="text-[#5B2DFF] font-black text-xs mt-1 tracking-tighter">{livro.preco}</p>
            </div>
          </div>
        ))}
      </div>

      {/* BOTÃO ADMIN */}
      {userEmail === adminEmail && (
        <button 
          onClick={() => setShowAdminForm(true)}
          className="fixed bottom-24 right-6 bg-[#5B2DFF] text-white p-4 rounded-full shadow-2xl z-40 border-4 border-white active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      )}

      {/* MODAL DE CADASTRO */}
      {showAdminForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-6 flex items-center justify-center animate-in zoom-in-95 duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowAdminForm(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><DollarSign size={24}/></div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-800">Cadastrar Produto</h3>
            </div>

            <form onSubmit={handleSalvarLivro} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Nome do Produto</label>
                <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" onChange={e => setNovoLivro({...novoLivro, titulo: e.target.value})} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Link de Venda (Checkout)</label>
                <input required placeholder="https://pay.cakto.com.br/..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-xs text-blue-600" onChange={e => setNovoLivro({...novoLivro, link_venda: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Preço (Ex: R$ 9,99)</label>
                  <input required placeholder="R$ 9,99" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" onChange={e => setNovoLivro({...novoLivro, preco: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Capa (URL)</label>
                  <input required placeholder="Link da imagem" className="w-full p-4 bg-slate-50 rounded-2xl outline-none text-xs" onChange={e => setNovoLivro({...novoLivro, capa_url: e.target.value})} />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={enviando}
                className="w-full py-5 bg-[#5B2DFF] text-white rounded-[28px] font-black shadow-lg shadow-purple-100 mt-4 active:scale-95 transition-all flex justify-center"
              >
                {enviando ? <Loader2 className="animate-spin"/> : 'ADICIONAR À VITRINE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Biblioteca;