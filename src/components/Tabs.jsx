import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookText, User, PenTool, BookOpen } from 'lucide-react';

const Tabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Não mostrar a barra de navegação quando estiver no modo leitura (Púlpito)
  if (location.pathname.includes('/leitura')) return null;

  const isActive = (path) => location.pathname === path;

  const btnClass = (path) => 
    `flex flex-col items-center gap-1 transition-colors ${
      isActive(path) ? 'text-[#6D28D9]' : 'text-gray-400'
    }`;

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 px-6 py-3 pb-6 flex justify-between items-center z-50">
      <button onClick={() => navigate('/')} className={btnClass('/')}>
        <BookText size={24} />
        <span className="text-[10px] font-bold">Sermões</span>
      </button>

      <button onClick={() => navigate('/devocionais')} className={btnClass('/devocionais')}>
        <BookOpen size={24} />
        <span className="text-[10px] font-bold">Devocionais</span>
      </button>

      {/* Botão Flutuante de Novo Sermão */}
      <button 
        onClick={() => navigate('/editor')}
        className="bg-[#6D28D9] p-4 rounded-full text-white shadow-lg shadow-purple-200 -mt-12 active:scale-90 transition-all border-4 border-white"
      >
        <PenTool size={24} />
      </button>

      <button onClick={() => navigate('/perfil')} className={btnClass('/perfil')}>
        <User size={24} />
        <span className="text-[10px] font-bold">Perfil</span>
      </button>
    </nav>
  );
};

export default Tabs;