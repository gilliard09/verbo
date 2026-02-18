import React, { useState } from 'react';
import { X, Search, BookOpen, Copy, Loader2 } from 'lucide-react';

const BibliaSidebar = ({ isOpen, onClose }) => {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const pesquisarBiblia = async (e) => {
    e.preventDefault();
    if (!busca) return;
    
    setLoading(true);
    try {
      // Usando a API gratuita (Versão Almeida por padrão)
      const res = await fetch(`https://bible-api.com/${busca}?translation=almeida`);
      const data = await res.json();
      
      if (data.text) {
        setResultado(data);
      } else {
        alert("Referência não encontrada. Ex: 'Joao 3:16'");
      }
    } catch (error) {
      console.error("Erro ao buscar bíblia:", error);
    } finally {
      setLoading(false);
    }
  };

  const copiarTexto = () => {
    if (resultado) {
      navigator.clipboard.writeText(`${resultado.text} (${resultado.reference})`);
      alert("Versículo copiado para o sermão!");
    }
  };

  return (
    <>
      {/* Overlay Escuro */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      )}

      {/* Painel Lateral */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-[101] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-[#5B2DFF]">
              <BookOpen size={24} />
              <h2 className="font-black uppercase tracking-tighter">Bíblia Rápida</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={pesquisarBiblia} className="relative mb-6">
            <input 
              type="text" 
              placeholder="Ex: João 3:16 ou Sl 23"
              className="w-full p-4 pr-12 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 ring-purple-100"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5B2DFF]">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {resultado ? (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-[#5B2DFF] text-xl">{resultado.reference}</h3>
                  <button onClick={copiarTexto} className="p-2 text-gray-400 hover:text-[#5B2DFF] transition-colors">
                    <Copy size={18} />
                  </button>
                </div>
                <p className="text-slate-600 leading-relaxed font-serif text-lg italic">
                  "{resultado.text.trim()}"
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <BookOpen size={48} className="mb-4" />
                <p className="text-xs font-black uppercase">Pesquise uma referência<br/>para leitura rápida.</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
              School Tech Digital • Pr. Jeferson
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BibliaSidebar;