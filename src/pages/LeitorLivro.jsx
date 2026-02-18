import React, { useState, useEffect } from 'react';
import { ChevronLeft, Download, Maximize2, Loader2, ExternalLink } from 'lucide-react';

const LeitorLivro = ({ livro, onVoltar }) => {
  const [loading, setLoading] = useState(true);

  // O conteúdo aqui é a URL do PDF que você salvou no Supabase
  const pdfUrl = livro.conteudo;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#121212] animate-in fade-in duration-500">
      
      {/* HEADER ESTILO KINDLE OASIS */}
      <header className="px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/5">
        <button 
          onClick={onVoltar} 
          className="text-white/70 hover:text-white transition-all active:scale-90"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="flex flex-col items-center max-w-[60%]">
          <span className="text-[9px] font-black uppercase tracking-[3px] text-[#5B2DFF] mb-0.5">
            Lendo agora
          </span>
          <h2 className="text-xs font-medium text-white/90 italic truncate w-full text-center font-playfair">
            {livro.titulo}
          </h2>
        </div>

        <button 
          onClick={() => window.open(pdfUrl, '_blank')} 
          className="text-white/40 hover:text-[#5B2DFF] transition-colors"
        >
          <ExternalLink size={20} />
        </button>
      </header>

      {/* ÁREA DO DOCUMENTO */}
      <main className="flex-1 relative overflow-hidden bg-[#1A1A1A]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-10">
            <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={32} />
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              Abrindo Manuscrito...
            </p>
          </div>
        )}

        {/* Utilizamos o parâmetro #toolbar=0 para tentar esconder a barra do navegador.
            Nota: Alguns navegadores mobile forçam a exibição da barra deles.
        */}
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="w-full h-full border-none"
          onLoad={() => setLoading(false)}
          title={livro.titulo}
          allow="fullscreen"
        />
      </main>

      {/* FOOTER DISCRETO */}
      <footer className="p-4 bg-black/60 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">
            Modo de Leitura Ativo
          </span>
        </div>
        <span className="text-[9px] font-black text-white/10 uppercase italic">
          School Tech Digital
        </span>
      </footer>
    </div>
  );
};

export default LeitorLivro;