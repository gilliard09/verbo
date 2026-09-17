import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Analytics } from '@vercel/analytics/react';

// --- IMPORTAÇÕES LAZY (CARREGAMENTO SOB DEMANDA) ---
const Dashboard = lazy(() => import('./pages/dashboard'));
const NovoSermao = lazy(() => import('./pages/novosermao'));
const Login = lazy(() => import('./pages/login'));
const ResetPassword = lazy(() => import('./pages/resetpassword'));
const Editor = lazy(() => import('./pages/editor'));
const Leitura = lazy(() => import('./pages/leitura'));
const Perfil = lazy(() => import('./pages/perfil'));
const Biblioteca = lazy(() => import('./pages/biblioteca'));
const LandingPage = lazy(() => import('./pages/landingpage'));
const Cursos = lazy(() => import('./pages/cursos'));
const Aulas = lazy(() => import('./pages/aulas'));
const AdminDashboard = lazy(() => import('./pages/admindashboard'));
const Upgrade = lazy(() => import('./pages/upgrade'));
const Devocionais = lazy(() => import('./pages/Devocionais'));

// --- COMPONENTES ---
import BibliaSidebar from './components/BibliaSidebar';
import RotaAdmin from './components/RotaAdmin';
import { Home, PenTool, User, Users, PlayCircle } from 'lucide-react';

// Rotas de autenticação/marketing onde a navbar inferior nunca deve aparecer,
// independente do estado de sessão (login, landing e recuperação de senha).
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

// ─── AppShell — precisa estar dentro do <Router> para usar useLocation ────────
const AppShell = ({ session, bibliaAberta, setBibliaAberta }) => {
  const location = useLocation();

  // Rotas onde a navbar inferior fica escondida (não reservamos o respiro pb-24 nelas)
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
        {/* Suspense garante uma transição suave entre o carregamento das páginas */}
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#4C1D95] border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/"                element={session ? <Dashboard />    : <LandingPage />} />
            <Route path="/novosermao" element={session ? <NovoSermao /> : <Navigate to="/login" replace />} />
            <Route path="/login"           element={!session ? <Login />        : <Navigate to="/" replace />} />
            {/* Sempre acessível: o Supabase cria uma sessão temporária de recuperação
                ao abrir o link do e-mail, então essa rota não pode depender de `session`. */}
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/landing"         element={<LandingPage />} />
            <Route path="/cursos"          element={session ? <Cursos />        : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId" element={session ? <Aulas />         : <Navigate to="/login" replace />} />
            <Route path="/admin"           element={session ? <RotaAdmin><AdminDashboard /></RotaAdmin> : <Navigate to="/login" replace />} />
            <Route path="/biblioteca"      element={session ? <Biblioteca />    : <Navigate to="/login" replace />} />
            <Route path="/editor"          element={session ? <Editor />        : <Navigate to="/login" replace />} />
            <Route path="/editor/:id"      element={session ? <Editor />        : <Navigate to="/login" replace />} />
            <Route path="/leitura/:id"     element={session ? <Leitura />       : <Navigate to="/login" replace />} />
            <Route path="/perfil"          element={session ? <Perfil onOpenBiblia={() => setBibliaAberta(true)} /> : <Navigate to="/login" replace />} />
            <Route path="/upgrade"         element={session ? <Upgrade />       : <Navigate to="/login" replace />} />
            <Route path="/devocionais"      element={session ? <Devocionais />    : <Navigate to="/login" replace />} />
            <Route path="*"                element={<Navigate to="/" replace />} />
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
    // 1. Registro do Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registrado:', reg.scope))
          .catch(err => console.error('Falha SW:', err));
      });
    }

    // 2. Lógica de Autenticação
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