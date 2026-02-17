import React, { useState } from 'react';
import { ChevronLeft, Info, Maximize2, RotateCw, ExternalLink, Loader2 } from 'lucide-react';

const LeitorLivro = ({ livro, onVoltar }) => {
  const [carregando, setCarregando] = useState(true);

  // A URL do PDF vem da coluna 'conteudo' do seu banco de dados
  const pdfUrl = livro.conteudo;
  
  // Usamos o visualizador do Google para renderizar o PDF de forma otimizada no mobile
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1A1A1A]">
      
      {/* HEADER MINIMALISTA ESTILO READER */}
      <header className="p-4 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/10">
        <button 
          onClick={onVoltar} 
          className="text-white p-2 hover:bg-white/10 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[3px] text-white/50">
            Lendo agora
          </h2>
          <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
            {livro.titulo}
          </h3>
        </div>

        <button 
          onClick={() => window.open(pdfUrl, '_blank')}
          className="text-white/70 p-2"
          title="Abrir PDF original"
        >
          <ExternalLink size={18} />
        </button>
      </header>

      {/* ÁREA DO DOCUMENTO */}
      <main className="flex-1 relative bg-slate-800">
        {carregando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
            <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={40} />
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Preparando sua leitura...</p>
          </div>
        )}
        
        <iframe
          src={googleViewerUrl}
          className="w-full h-full border-none shadow-2xl"
          onLoad={() => setCarregando(false)}
          title={livro.titulo}
        />
      </main>

      {/* BARRA DE APOIO AO LEITOR */}
      <footer className="p-4 bg-white flex items-center justify-between rounded-t-[32px]">
        <div className="flex items-center gap-3 text-slate-400">
          <Info size={16} />
          <span className="text-[10px] font-bold uppercase tracking-tight">
            Deslize para navegar pelas páginas
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[#5B2DFF]">
          <span className="text-[10px] font-black uppercase">Pr. Jeferson</span>
          <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
        </div>
      </footer>
    </div>
  );
};

export default LeitorLivro;