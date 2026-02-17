import React, { useState } from 'react';
import { ChevronLeft, Maximize2, Download, BookOpen, Loader2 } from 'lucide-react';

const LeitorLivro = ({ livro, onVoltar }) => {
  const [loading, setLoading] = useState(true);

  // Link do PDF vindo do banco de dados
  const pdfUrl = livro.conteudo;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#121212] animate-in fade-in duration-500">
      
      {/* HEADER ULTRA MINIMALISTA (ESTILO KINDLE) */}
      <header className="px-6 py-4 flex items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5">
        <button onClick={onVoltar} className="text-white/80 hover:text-white transition-colors">
          <ChevronLeft size={28} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase tracking-[4px] text-[#5B2DFF]">Leitura Ativa</span>
          <h2 className="text-xs font-medium text-white/90 italic">{livro.titulo}</h2>
        </div>

        <button onClick={() => window.open(pdfUrl)} className="text-white/40">
          <Download size={20} />
        </button>
      </header>

      {/* CONTAINER DO PDF - Ocupa a tela toda para focar no conteúdo */}
      <main className="flex-1 relative bg-[#1A1A1A]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-10">
            <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={32} />
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Carregando Páginas...</p>
          </div>
        )}

        {/* DICA: Para ficar IGUAL ao Kindle, o ideal seria converter o PDF para texto. 
            Como usamos PDF, este visualizador abaixo é o mais limpo possível.
        */}
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className="w-full h-full border-none"
          onLoad={() => setLoading(false)}
          title={livro.titulo}
        />
      </main>

      {/* RODAPÉ DISCRETO */}
      <footer className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
        <div className="flex items-center gap-2 text-white/20">
          <BookOpen size={12} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">
            Leitura digital
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LeitorLivro;