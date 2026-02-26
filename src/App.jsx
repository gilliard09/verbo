import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// --- IMPORTAÇÕES (Atenção total às letras minúsculas aqui) ---
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Editor from './pages/editor';
import Leitura from './pages/leitura';
import Perfil from './pages/perfil';
import Biblioteca from './pages/biblioteca';
import LandingPage from './pages/landingpage'; 

// --- COMPONENTES ---
import BibliaSidebar from './components/BibliaSidebar';
import { Home, BookOpen, PenTool, User, Book } from 'lucide-react';

const Navbar = ({ onOpenBiblia, session }) => {
  const location = useLocation();
  const isPublic = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/landing';
  const isReading = location.pathname.startsWith('/leitura');
  if (!session || isPublic || isReading) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-50 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <Home size={22} /><span className="text-[10px] font-bold mt-1">Início</span>
      </Link>
      <Link to="/biblioteca" className={`flex flex-col items-center ${location.pathname === '/biblioteca' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <BookOpen size={22} /><span className="text-[10px] font-bold mt-1">Produtos</span>
      </Link>
      <Link to="/editor" className="flex flex-col items-center -mt-10">
        <div className="bg-[#5B2DFF] p-4 rounded-full text-white shadow-lg shadow-purple-200"><PenTool size={24} /></div>
      </Link>
      <button onClick={onOpenBiblia} className="flex flex-col items-center text-gray-400">
        <Book size={22} /><span className="text-[10px] font-bold mt-1">Bíblia</span>
      </button>
      <Link to="/perfil" className={`flex flex-col items-center ${location.pathname === '/perfil' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <User size={22} /><span className="text-[10px] font-bold mt-1">Perfil</span>
      </Link>
    </nav>
  );
};

function App() {
  const [session, setSession] = useState(null);
  const [bibliaAberta, setBibliaAberta] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
      } catch (error) {
        console.error("Erro Supabase:", error);
      } finally {
        setIsChecking(false);
      }
    };
    getInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isChecking) return <div className="min-h-screen bg-[#FDFDFF]" />;

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFDFF]">
        <div className={session ? "pb-24" : ""}>
          <Routes>
            <Route path="/" element={session ? <Dashboard /> : <LandingPage />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/biblioteca" element={session ? <Biblioteca /> : <Navigate to="/login" replace />} />
            <Route path="/editor" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/editor/:id" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/leitura/:id" element={session ? <Leitura /> : <Navigate to="/login" replace />} />
            <Route path="/perfil" element={session ? <Perfil /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Navbar session={session} onOpenBiblia={() => setBibliaAberta(true)} />
        {session && <BibliaSidebar isOpen={bibliaAberta} onClose={() => setBibliaAberta(false)} />}
      </div>
    </Router>
  );
}

export default App;