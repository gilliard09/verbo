import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importação das suas páginas
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/Perfil';

// Importação dos ícones para o menu
import { Home, PenTool, User, BookOpen } from 'lucide-react';

// Componente do Menu Inferior
const Navbar = () => {
  const location = useLocation();
  
  // O menu não aparece no modo de leitura para focar na pregação
  if (location.pathname.startsWith('/leitura')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-8">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <Home size={22} />
        <span className="text-[10px] font-bold mt-1">Início</span>
      </Link>
      <Link to="/editor" className={`flex flex-col items-center ${location.pathname === '/editor' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <PenTool size={22} />
        <span className="text-[10px] font-bold mt-1">Escrever</span>
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
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null; // Ou um loading spinner roxo

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFDFF]">
        {!session ? (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        ) : (
          <>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:id" element={<Editor />} />
              <Route path="/leitura/:id" element={<Leitura />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Navbar />
          </>
        )}
      </div>
    </Router>
  );
}

export default App;