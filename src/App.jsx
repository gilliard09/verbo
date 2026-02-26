import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Páginas
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/Perfil';
import Biblioteca from './pages/Biblioteca';
import LandingPage from './pages/Teste'; 

// Componentes
import BibliaSidebar from './components/BibliaSidebar';
import { Home, BookOpen, PenTool, User, Book } from 'lucide-react';

// --- COMPONENTE NAVBAR ---
const Navbar = ({ onOpenBiblia, session }) => {
  const location = useLocation();
  
  // Lógica para esconder a navbar: se não estiver logado ou em páginas específicas
  const isPublic = location.pathname === '/login' || location.pathname === '/landing';
  const isReading = location.pathname.startsWith('/leitura');
  
  // Importante: Se o usuário estiver na raiz "/" e NÃO houver sessão, a navbar some (pois é a Landing Page)
  if (!session || isPublic || isReading) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-50 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <Home size={22} />
        <span className="text-[10px] font-bold mt-1">Início</span>
      </Link>
      
      <Link to="/biblioteca" className={`flex flex-col items-center ${location.pathname === '/biblioteca' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <BookOpen size={22} />
        <span className="text-[10px] font-bold mt-1">Produtos</span>
      </Link>
      
      <Link to="/editor" className="flex flex-col items-center -mt-10">
        <div className="bg-[#5B2DFF] p-4 rounded-full shadow-lg shadow-purple-200 text-white hover:scale-110 transition-transform">
          <PenTool size={24} />
        </div>
      </Link>

      <button 
        onClick={onOpenBiblia} 
        className="flex flex-col items-center text-gray-400 hover:text-[#5B2DFF] transition-colors"
      >
        <Book size={22} />
        <span className="text-[10px] font-bold mt-1">Bíblia</span>
      </button>
      
      <Link to="/perfil" className={`flex flex-col items-center ${location.pathname === '/perfil' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <User size={22} />
        <span className="text-[10px] font-bold mt-1">Perfil</span>
      </Link>
    </nav>
  );
};

// --- COMPONENTE PRINCIPAL APP ---
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bibliaAberta, setBibliaAberta] = useState(false);

  useEffect(() => {
    // Busca sessão inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Erro Supabase:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFDFF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#5B2DFF] border-solid border-gray-200"></div>
          <span className="text-[10px] font-black text-[#5B2DFF] uppercase tracking-widest italic">O Verbo está carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFDFF]">
        <Routes>
          {!session ? (
            /* --- ROTAS PÚBLICAS --- */
            <Route path="/*" element={
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            } />
          ) : (
            /* --- ROTAS PRIVADAS --- */
            <Route path="/*" element={
              <>
                <div className="pb-24">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/biblioteca" element={<Biblioteca />} /> 
                    <Route path="/editor" element={<Editor />} />
                    <Route path="/editor/:id" element={<Editor />} />
                    <Route path="/leitura/:id" element={<Leitura />} />
                    <Route path="/perfil" element={<Perfil />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
                
                {/* Elementos fixos da interface logada */}
                <Navbar session={session} onOpenBiblia={() => setBibliaAberta(true)} />
                <BibliaSidebar isOpen={bibliaAberta} onClose={() => setBibliaAberta(false)} />
              </>
            } />
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;