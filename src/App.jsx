import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importação das páginas - Garante o 's' em Devocionais para evitar erro na Vercel
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/Perfil';
import Devocionais from './pages/Devocionais'; 

// Importação de Ícones
import { Home, BookOpen, PenTool, User } from 'lucide-react';

// Componente de Navegação Inferior
const Navbar = () => {
  const location = useLocation();
  
  // Esconde a barra no modo leitura ou login
  if (location.pathname.startsWith('/leitura') || location.pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <Home size={22} />
        <span className="text-[10px] font-bold mt-1">Início</span>
      </Link>
      
      <Link to="/devocional" className={`flex flex-col items-center ${location.pathname === '/devocional' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <BookOpen size={22} />
        <span className="text-[10px] font-bold mt-1">Devocional</span>
      </Link>
      
      <Link to="/editor" className="flex flex-col items-center -mt-10">
        <div className="bg-[#5B2DFF] p-4 rounded-full shadow-lg shadow-purple-200 text-white">
          <PenTool size={24} />
        </div>
      </Link>
      
      <Link to="/perfil" className={`flex flex-col items-center ${location.pathname === '/perfil' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <User size={22} />
        <span className="text-[10px] font-bold mt-1">Perfil</span>
      </Link>
    </nav>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica sessão inicial (importante para links de e-mail)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuta mudanças de autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFDFF]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#5B2DFF]"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFDFF]">
        {!session ? (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        ) : (
          <>
            <div className="pb-32"> {/* Padding para não cobrir conteúdo com a Navbar */}
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/devocional" element={<Devocionais />} />
                <Route path="/editor" element={<Editor />} />
                <Route path="/editor/:id" element={<Editor />} />
                <Route path="/leitura/:id" element={<Leitura />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
            <Navbar />
          </>
        )}
      </div>
    </Router>
  );
}

export default App;