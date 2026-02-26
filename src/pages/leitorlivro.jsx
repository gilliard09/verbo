import React, { useState, useEffect } from 'react';
import { ChevronLeft, Type, Moon, Sun, Loader2 } from 'lucide-react';

const LeitorLivro = ({ livro, onVoltar }) => {
  const [conteudoTexto, setConteudoTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [tema, setTema] = useState('sepia');
  const [fontSize, setFontSize] = useState(20); // Fonte maior por padrão para o púlpito
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Função para buscar o texto do arquivo hospedado
    const carregarTexto = async () => {
      try {
        const response = await fetch(livro.conteudo);
        const texto = await response.text();
        setConteudoTexto(texto);
      } catch (error) {
        setConteudoTexto("Erro ao carregar o conteúdo. Verifique o link do arquivo.");
      } finally {
        setLoading(false);
      }
    };

    if (livro.conteudo.startsWith('http')) {
      carregarTexto();
    } else {
      setConteudoTexto(livro.conteudo);
      setLoading(false);
    }
  }, [livro.conteudo]);

  const temasStyles = {
    white: { bg: 'bg-[#FFFFFF]', text: 'text-slate-900', border: 'border-gray-200', title: 'text-slate-500' },
    sepia: { bg: 'bg-[#F4ECD8]', text: 'text-[#5B4636]', border: 'border-[#E2D6B5]', title: 'text-[#8C7867]' },
    dark: { bg: 'bg-[#121212]', text: 'text-gray-400', border: 'border-white/5', title: 'text-gray-600' }
  };

  const s = temasStyles[tema];

  if (loading) return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#121212]">
      <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={32} />
      <p className="text-white/30 text-xs font-black uppercase tracking-widest">Preparando Púlpito...</p>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col transition-colors duration-500 ${s.bg}`}>
      <header className={`p-4 flex items-center justify-between border-b ${s.border}`}>
        <button onClick={onVoltar} className={s.text}><ChevronLeft size={24} /></button>
        <h2 className={`text-[10px] font-black uppercase tracking-widest ${s.title}`}>{livro.titulo}</h2>
        <button onClick={() => setShowControls(!showControls)} className={s.text}><Type size={20} /></button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <article 
          className={`max-w-2xl mx-auto leading-[1.8] font-serif ${s.text} whitespace-pre-wrap`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <h1 className="text-4xl font-playfair font-black mb-8 leading-tight">{livro.titulo}</h1>
          <div className="w-12 h-1 bg-[#5B2DFF] mb-10 opacity-30 rounded-full"></div>
          
          {conteudoTexto}
        </article>
      </main>

      {showControls && (
        <div className={`absolute bottom-24 left-4 right-4 p-6 rounded-[32px] shadow-2xl border ${s.bg} ${s.border} animate-in fade-in slide-in-from-bottom-4`}>
          <div className="flex items-center justify-between mb-8">
            <span className={`text-[10px] font-black uppercase tracking-widest ${s.title}`}>Tamanho da Fonte</span>
            <div className="flex gap-6">
              <button onClick={() => setFontSize(Math.max(16, fontSize - 2))} className={`p-2 font-bold ${s.text}`}>A-</button>
              <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className={`p-2 text-xl font-bold ${s.text}`}>A+</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${s.title}`}>Tema de Leitura</span>
            <div className="flex gap-4">
              <button onClick={() => setTema('white')} className="w-10 h-10 bg-white border border-gray-300 rounded-full" />
              <button onClick={() => setTema('sepia')} className="w-10 h-10 bg-[#F4ECD8] border border-[#E2D6B5] rounded-full" />
              <button onClick={() => setTema('dark')} className="w-10 h-10 bg-[#121212] border border-white/10 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeitorLivro;