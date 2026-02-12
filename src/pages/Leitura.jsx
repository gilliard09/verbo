import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Type, Moon, Sun, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Leitura = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sermao, setSermao] = useState(null);
  const [tema, setTema] = useState('sepia'); // sepia, dark, light
  const [fontSize, setFontSize] = useState(22);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSermao() {
      try {
        // 1. Tenta buscar do banco de dados (Online)
        const { data, error } = await supabase
          .from('sermoes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;

        if (data) {
          setSermao(data);
          // 2. Salva uma cópia de segurança no dispositivo
          localStorage.setItem(`offline_sermao_${id}`, JSON.stringify(data));
        }
      } catch (error) {
        console.log("Modo offline detectado ou erro de rede. Buscando cópia local...");
        
        // 3. Busca a cópia salva no LocalStorage se a internet falhar
        const copiaLocal = localStorage.getItem(`offline_sermao_${id}`);
        if (copiaLocal) {
          setSermao(JSON.parse(copiaLocal));
        } else {
          console.error('Nenhuma cópia local encontrada:', error.message);
        }
      } finally {
        setLoading(false);
      }
    }
    loadSermao();
  }, [id]);

  const temas = {
    sepia: "bg-[#F4ECD8] text-[#5B4636]",
    light: "bg-white text-gray-900",
    dark: "bg-[#1A1A1B] text-gray-200"
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${temas[tema]}`}>
        <Loader2 className="animate-spin opacity-50" size={40} />
      </div>
    );
  }

  if (!sermao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="mb-4 opacity-60">Sermão não disponível offline.</p>
        <button onClick={() => navigate('/')} className="text-[#6D28D9] font-bold underline">Voltar</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${temas[tema]}`}>
      {/* Header de Controle */}
      <header className="p-4 flex justify-between items-center border-b border-black/5 sticky top-0 backdrop-blur-md z-10 bg-inherit">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-black/5 rounded-full transition-colors"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setFontSize(prev => Math.max(16, prev - 2))} 
            className="px-3 py-1 border border-black/10 rounded-lg font-bold hover:bg-black/5 active:scale-95 transition-all text-sm"
          >
            A-
          </button>

          <button 
            onClick={() => setFontSize(prev => Math.min(48, prev + 2))} 
            className="px-3 py-1 border border-black/10 rounded-lg font-bold hover:bg-black/5 active:scale-95 transition-all text-sm"
          >
            A+
          </button>
          
          <button 
            onClick={() => setTema(tema === 'sepia' ? 'light' : tema === 'light' ? 'dark' : 'sepia')} 
            className="ml-2 p-2 border border-black/10 rounded-lg hover:bg-black/5 active:rotate-12 transition-all"
          >
            {tema === 'sepia' ? <Type size={20} /> : tema === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Área de Leitura */}
      <main className="max-w-3xl mx-auto p-8 pb-32">
        <h1 className="text-4xl font-extrabold mb-10 font-poppins leading-tight border-b-2 border-black/5 pb-4">
          {sermao.titulo}
        </h1>
        
        <div 
          className="prose max-w-none font-serif select-none"
          style={{ 
            fontSize: `${fontSize}px`, 
            lineHeight: '1.8',
          }}
          dangerouslySetInnerHTML={{ __html: sermao.conteudo }}
        />
      </main>

      <footer className="fixed bottom-0 w-full p-4 text-center text-[10px] uppercase tracking-widest opacity-30 pointer-events-none">
        Modo Púlpito Ativo • Pregue Mais
      </footer>
    </div>
  );
};

export default Leitura;