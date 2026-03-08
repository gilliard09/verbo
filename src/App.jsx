import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Analytics } from '@vercel/analytics/react'; // <--- ADICIONADO: Integração Vercel

// --- IMPORTAÇÕES (Tudo em minúsculo conforme padronizado) ---
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Editor from './pages/editor';
import Leitura from './pages/leitura';
import Perfil from './pages/perfil';
import Biblioteca from './pages/biblioteca';
import LandingPage from './pages/landingpage'; 
import Cursos from './pages/cursos';
import Aulas from './pages/aulas';
import AdminDashboard from './pages/admindashboard'; // <--- Adicionado: Importação do Painel Admin

// --- COMPONENTES ---
import BibliaSidebar from './components/BibliaSidebar';
import { Home, PenTool, User, Book, PlayCircle, LayoutDashboard } from 'lucide-react';

const Navbar = ({ onOpenBiblia, session }) => {
  const location = useLocation();
  
  // Páginas onde a Navbar NÃO deve aparecer
  const isPublicPage = location.pathname === '/login' || location.pathname === '/landing';
  const isReading = location.pathname.startsWith('/leitura');
  const isAdminPage = location.pathname.startsWith('/admin'); // <--- Esconde a navbar no painel admin para ganhar espaço
  
  if (!session || isPublicPage || isReading || isAdminPage) return null;

  return (
    /* AJUSTE: pb-[calc(env(safe-area-inset-bottom)+12px)] resolve o corte no iPhone 11 */
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 flex justify-between items-center z-[100] pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <Home size={22} /><span className="text-[10px] font-bold mt-1">Início</span>
      </Link>
      
      <Link to="/cursos" className={`flex flex-col items-center ${location.pathname.startsWith('/cursos') ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <PlayCircle size={22} /><span className="text-[10px] font-bold mt-1">Academia</span>
      </Link>
      
      <Link to="/editor" className="flex flex-col items-center -mt-10">
        <div className="bg-[#5B2DFF] p-4 rounded-full text-white shadow-lg shadow-purple-200 hover:scale-105 active:scale-95 transition-all">
          <PenTool size={24} />
        </div>
      </Link>
      
      <button 
        onClick={onOpenBiblia} 
        className="flex flex-col items-center text-gray-400 hover:text-[#5B2DFF] transition-colors cursor-pointer"
      >
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

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5B2DFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFDFF]">
        {/* AJUSTE: O padding inferior do main agora acompanha a altura dinâmica da Navbar */}
        <main className={session ? "pb-[calc(env(safe-area-inset-bottom)+100px)]" : ""}>
          <Routes>
            <Route path="/" element={session ? <Dashboard /> : <LandingPage />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/landing" element={<LandingPage />} />
            
            {/* --- ACADEMIA VERBO --- */}
            <Route path="/cursos" element={session ? <Cursos /> : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId" element={session ? <Aulas /> : <Navigate to="/login" replace />} />
            
            {/* --- PAINEL ADMIN --- */}
            <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/login" replace />} />
            
            {/* --- FERRAMENTAS DO PREGADOR --- */}
            <Route path="/biblioteca" element={session ? <Biblioteca /> : <Navigate to="/login" replace />} />
            <Route path="/editor" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/editor/:id" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/leitura/:id" element={session ? <Leitura /> : <Navigate to="/login" replace />} />
            <Route path="/perfil" element={session ? <Perfil /> : <Navigate to="/login" replace />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <Navbar session={session} onOpenBiblia={() => setBibliaAberta(true)} />
        <Analytics />
        
        {session && (
          <BibliaSidebar isOpen={bibliaAberta} onClose={() => setBibliaAberta(false)} />
        )}
      </div>
    </Router>
  );
}

export default App;