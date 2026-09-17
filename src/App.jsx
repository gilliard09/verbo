import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Analytics } from '@vercel/analytics/react';

// --- ROTES PRINCIPAIS (Carregamento crítico: Login, Landing, Reset) ---
// Essas 3 rotas PRECISAM estar rápidas porque o usuário vê elas primeiro
const Login = lazy(() => import('./pages/login'));
const LandingPage = lazy(() => import('./pages/landingpage'));
const ResetPassword = lazy(() => import('./pages/resetpassword'));

// --- ROTAS AUTENTICADAS (Lazy load: carregam quando user está logado) ---
// Dashboard é a primeira rota após login, então tem prioridade
const Dashboard = lazy(() => import('./pages/dashboard'));

// Editor & Criação de Conteúdo (pesado: Tiptap + Google AI)
const Editor = lazy(() => import('./pages/editor'));
const NovoSermao = lazy(() => import('./pages/novosermao'));

// Leitura & Biblioteca (pesado: PDF.js + react-pdf)
const Leitura = lazy(() => import('./pages/leitura'));
const Biblioteca = lazy(() => import('./pages/biblioteca'));

// Academia (pesado: Vídeos + estrutura de curso)
const Cursos = lazy(() => import('./pages/cursos'));
const Aulas = lazy(() => import('./pages/aulas'));

// Utilities (carregam rápido, podem ficar juntos)
const Perfil = lazy(() => import('./pages/perfil'));
const Devocionais = lazy(() => import('./pages/Devocionais'));
const Upgrade = lazy(() => import('./pages/upgrade'));

// Admin (não é crítico, usuário normal nunca vê)
const AdminDashboard = lazy(() => import('./pages/admindashboard'));

// --- COMPONENTES ---
import BibliaSidebar from './components/BibliaSidebar';
import RotaAdmin from './components/RotaAdmin';
import { Home, PenTool, User, Users, PlayCircle } from 'lucide-react';

// Rotas onde a navbar inferior nunca deve aparecer
const ROTAS_SEM_NAVBAR = ['/login', '/landing', '/reset-password'];

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = ({ session, onOpenBiblia }) => {
  const location = useLocation();

  const isPublicPage = ROTAS_SEM_NAVBAR.includes(location.pathname);
  const isReading    = location.pathname.startsWith('/leitura');
  const isAdminPage  = location.pathname.startsWith('/admin');
  const isEditor     = location.pathname.startsWith('/editor');
  const isUpgrade    = location.pathname.startsWith('/upgrade');
  const isCursos     = location.pathname.startsWith('/cursos');

  if (!session || isPublicPage || isReading || isAdminPage || isEditor || isUpgrade || isCursos) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-[100] pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#4C1D95]' : 'text-gray-400'}`}>
        <Home size={22} /><span className="text-[10px] font-bold mt-1">Início</span>
      </Link>

      <Link to="/cursos" className={`flex flex-col items-center ${location.pathname.startsWith('/cursos') ? 'text-[#4C1D95]' : 'text-gray-400'}`}>
        <PlayCircle size={22} /><span className="text-[10px] font-bold mt-1">Academia</span>
      </Link>

      <Link to="/editor" className="flex flex-col items-center -mt-10">
        <div className="bg-[#4C1D95] p-4 rounded-full text-white shadow-lg shadow-purple-200 hover:scale-105 active:scale-95 transition-all">
          <PenTool size={24} />
        </div>
      </Link>

      <Link to="/devocionais" className={`flex flex-col items-center ${location.pathname.startsWith('/devocionais') ? 'text-[#4C1D95]' : 'text-gray-400'}`}>
        <Users size={22} /><span className="text-[10px] font-bold mt-1">Devocionais</span>
      </Link>

      <Link to="/perfil" className={`flex flex-col items-center ${location.pathname === '/perfil' ? 'text-[#4C1D95]' : 'text-gray-400'}`}>
        <User size={22} /><span className="text-[10px] font-bold mt-1">Perfil</span>
      </Link>
    </nav>
  );
};

// ─── AppShell ─────────────────────────────────────────────────────────────────
const AppShell = ({ session, bibliaAberta, setBibliaAberta }) => {
  const location = useLocation();

  const isPublicPage = ROTAS_SEM_NAVBAR.includes(location.pathname);
  const isReading    = location.pathname.startsWith('/leitura');
  const isAdminPage  = location.pathname.startsWith('/admin');
  const isEditor     = location.pathname.startsWith('/editor');
  const isUpgrade    = location.pathname.startsWith('/upgrade');
  const isCursos     = location.pathname.startsWith('/cursos');

  const navbarEscondida = !session || isPublicPage || isReading || isAdminPage || isEditor || isUpgrade || isCursos;

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      <main className={session && !navbarEscondida ? "pb-24" : ""}>
        {/* Suspense fallback: Loading spinner customizado */}
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#4C1D95] border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            {/* PUBLIC ROUTES — Rápidas e sem dependências de autenticação */}
            <Route path="/" element={session ? <Dashboard /> : <LandingPage />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/landing" element={<LandingPage />} />

            {/* AUTHENTICATED ROUTES — Dashboard & Main App */}
            <Route path="/novosermao" element={session ? <NovoSermao /> : <Navigate to="/login" replace />} />
            <Route path="/editor" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/editor/:id" element={session ? <Editor /> : <Navigate to="/login" replace />} />

            {/* LEITURA & BIBLIOTECA — Pesadas (PDF.js) */}
            <Route path="/leitura/:id" element={session ? <Leitura /> : <Navigate to="/login" replace />} />
            <Route path="/biblioteca" element={session ? <Biblioteca /> : <Navigate to="/login" replace />} />

            {/* ACADEMIA — Pesada (Vídeos) */}
            <Route path="/cursos" element={session ? <Cursos /> : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId" element={session ? <Aulas /> : <Navigate to="/login" replace />} />

            {/* UTILITIES — Leves */}
            <Route path="/perfil" element={session ? <Perfil onOpenBiblia={() => setBibliaAberta(true)} /> : <Navigate to="/login" replace />} />
            <Route path="/devocionais" element={session ? <Devocionais /> : <Navigate to="/login" replace />} />
            <Route path="/upgrade" element={session ? <Upgrade /> : <Navigate to="/login" replace />} />

            {/* ADMIN — Não é crítico */}
            <Route path="/admin" element={session ? <RotaAdmin><AdminDashboard /></RotaAdmin> : <Navigate to="/login" replace />} />

            {/* CATCH ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Navbar session={session} onOpenBiblia={() => setBibliaAberta(true)} />
      <Analytics />

      {session && (
        <BibliaSidebar isOpen={bibliaAberta} onClose={() => setBibliaAberta(false)} />
      )}
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [session, setSession] = useState(null);
  const [bibliaAberta, setBibliaAberta] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 1. Service Worker Registration (apenas uma vez)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registrado:', reg.scope))
          .catch(err => console.error('Falha SW:', err));
      });
    }

    // 2. Get Initial Session
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

    // 3. Listen to Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state enquanto verifica sessão
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4C1D95] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <AppShell session={session} bibliaAberta={bibliaAberta} setBibliaAberta={setBibliaAberta} />
    </Router>
  );
}

export default App;