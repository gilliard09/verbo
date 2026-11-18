import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Analytics } from '@vercel/analytics/react';

// --- IMPORTAÇÕES LAZY (CARREGAMENTO SOB DEMANDA) ---
// Essas páginas APENAS são carregadas quando o usuário navega até elas
const Dashboard = lazy(() => import('./pages/dashboard'));
const NovoSermao = lazy(() => import('./pages/novosermao'));
const Login = lazy(() => import('./pages/login'));
const ResetPassword = lazy(() => import('./pages/resetpassword'));
const Editor = lazy(() => import('./pages/editor'));
const Leitura = lazy(() => import('./pages/leitura'));
const Perfil = lazy(() => import('./pages/perfil'));
const Biblioteca = lazy(() => import('./pages/biblioteca'));
const LandingPage = lazy(() => import('./pages/landingpage'));
const LpExclusivo = lazy(() => import('./pages/lp-exclusivo'));
const Cursos = lazy(() => import('./pages/cursos'));
const Curso = lazy(() => import('./pages/curso'));
const Aulas = lazy(() => import('./pages/aulas'));
const Avaliacao = lazy(() => import('./pages/avaliacao'));
const AdminAvaliacoes = lazy(() => import('./pages/adminavaliacoes'));
const AdminDashboard = lazy(() => import('./pages/admindashboard'));
const Upgrade = lazy(() => import('./pages/upgrade'));
const Devocionais = lazy(() => import('./pages/Devocionais'));

// --- COMPONENTES SÍNCRONOS (Precisam estar prontos na primeira render) ---
import BibliaSidebar from './components/BibliaSidebar';
import AcquisitionSourceModal from './components/AcquisitionSourceModal';
import PlusVitalicioModal from './components/PlusVitalicioModal';
import RotaAdmin from './components/RotaAdmin';
import { Home, PenTool, User, Users, PlayCircle } from 'lucide-react';

// Rotas de autenticação/marketing onde a navbar inferior nunca deve aparecer,
// independente do estado de sessão (login, landing e recuperação de senha).
const ROTAS_SEM_NAVBAR = ['/login', '/landing', '/lp-exclusivo', '/reset-password'];

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

  const navItemClass = (active) =>
    `flex flex-col items-center justify-center min-w-[3.5rem] rounded-xl px-2 py-1.5 border backdrop-blur-md transition-all duration-200 ${active
      ? 'text-[#4C1D95] bg-white/65 border-white/80 shadow-[0_2px_10px_rgba(76,29,149,0.10)]'
      : 'text-gray-500 bg-white/25 border-white/35 hover:bg-white/55 hover:text-[#4C1D95]'}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/65 backdrop-blur-2xl border-t border-white/70 px-4 py-3 flex justify-between items-center z-[100] pb-8 shadow-[0_-8px_30px_rgba(31,24,48,0.10)]">
      <Link to="/" className={navItemClass(location.pathname === '/')}>
        <Home size={22} /><span className="text-[10px] font-bold mt-1">Início</span>
      </Link>

      <Link to="/cursos" className={navItemClass(location.pathname.startsWith('/cursos'))}>
        <PlayCircle size={22} /><span className="text-[10px] font-bold mt-1">Academia</span>
      </Link>

      <Link to="/editor" aria-label="Novo Sermão" className="flex flex-col items-center -mt-10">
        <div className="bg-[#4C1D95]/90 backdrop-blur-xl p-4 rounded-full text-white border border-white/40 shadow-[0_8px_24px_rgba(76,29,149,0.30)] hover:scale-105 active:scale-95 transition-all">
          <PenTool size={24} />
        </div>
      </Link>

      <Link to="/devocionais" className={navItemClass(location.pathname.startsWith('/devocionais'))}>
        <Users size={22} /><span className="text-[10px] font-bold mt-1">Devocionais</span>
      </Link>

      <Link to="/perfil" className={navItemClass(location.pathname === '/perfil')}>
        <User size={22} /><span className="text-[10px] font-bold mt-1">Perfil</span>
      </Link>
    </nav>
  );
};

// ─── Skeleton de carregamento: mantém a estrutura visual enquanto a rota abre ──
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#F8F9FA] px-5 pt-10 animate-pulse" aria-label="Carregando conteúdo">
    <div className="mx-auto max-w-3xl space-y-7">
      <div className="h-4 w-28 rounded-full bg-violet-100" />
      <div className="space-y-3">
        <div className="h-8 w-2/3 rounded-lg bg-slate-200" />
        <div className="h-4 w-1/2 rounded-full bg-slate-100" />
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 space-y-4 shadow-sm">
        <div className="h-4 w-1/3 rounded-full bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-4 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-4/5 rounded-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-2xl bg-slate-100" />
        <div className="h-28 rounded-2xl bg-slate-100" />
      </div>
    </div>
  </div>
);

// ─── Abertura da marca: animação leve, sem dependências externas ──────────────
const SplashScreen = ({ visible }) => (
  <div className={`verbo-splash ${visible ? 'is-visible' : 'is-hidden'}`} aria-hidden="true">
    <div className="verbo-splash-brand">
      <svg className="verbo-splash-mark" viewBox="0 0 120 112" fill="none" role="presentation">
        <g className="verbo-splash-page verbo-splash-page-left">
          <path d="M60 92 13 74V17l47 19v56Z" fill="white" />
          <path d="m21 29 31 12M21 39l31 12M21 49l31 12" stroke="#6D28D9" strokeOpacity=".25" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <g className="verbo-splash-page verbo-splash-page-right">
          <path d="m60 92 47-18V17L60 36v56Z" fill="white" />
          <path d="m99 29-31 12M99 39 68 51M99 49 68 61" stroke="#6D28D9" strokeOpacity=".25" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <path d="M60 35v57" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".9" />
      </svg>
      <div className="verbo-splash-wordmark">VERBO</div>
      <div className="verbo-splash-tagline">O Verbo nasce da Palavra</div>
    </div>
  </div>
);

// ─── AppShell — precisa estar dentro do <Router> para usar useLocation ────────
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
        <div key={location.pathname} className="verbo-route-enter">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={session ? <Dashboard /> : <LandingPage />} />
            <Route path="/novosermao" element={session ? <NovoSermao /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/lp-exclusivo" element={<LpExclusivo />} />
            <Route path="/cursos" element={session ? <Cursos /> : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId/materia/:materiaId" element={session ? <Aulas /> : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId/materia/:materiaId/avaliacao/:avaliacaoId" element={session ? <Avaliacao /> : <Navigate to="/login" replace />} />
            <Route path="/cursos/:cursoId" element={session ? <Curso /> : <Navigate to="/login" replace />} />
            <Route path="/admin" element={session ? <RotaAdmin><AdminDashboard /></RotaAdmin> : <Navigate to="/login" replace />} />
            <Route path="/admin/avaliacoes" element={session ? <RotaAdmin><AdminAvaliacoes /></RotaAdmin> : <Navigate to="/login" replace />} />
            <Route path="/biblioteca" element={session ? <Biblioteca /> : <Navigate to="/login" replace />} />
            <Route path="/editor" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/editor/:id" element={session ? <Editor /> : <Navigate to="/login" replace />} />
            <Route path="/leitura/:id" element={session ? <Leitura /> : <Navigate to="/login" replace />} />
            <Route path="/perfil" element={session ? <Perfil onOpenBiblia={() => setBibliaAberta(true)} /> : <Navigate to="/login" replace />} />
            <Route path="/upgrade" element={session ? <Upgrade /> : <Navigate to="/login" replace />} />
            <Route path="/devocionais" element={session ? <Devocionais /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </div>
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
  const [authReady, setAuthReady] = useState(false);
  const [acquisitionModalOpen, setAcquisitionModalOpen] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  // Reproduz a abertura em cada nova entrada/retomada do PWA, sem atrasar o app.
  useEffect(() => {
    let timeoutId;
    const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 350 : 950;

    const showSplash = () => {
      setSplashVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setSplashVisible(false), duration);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') showSplash();
      else window.clearTimeout(timeoutId);
    };

    showSplash();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // O landing page não depende da autenticação. A sessão é verificada
    // em segundo plano para não bloquear o primeiro paint.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registrado:', reg.scope))
          .catch(err => console.error('Falha SW:', err));
      });
    }

    let mounted = true;

    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        if (mounted) setSession(initialSession);
      })
      .catch(error => console.error('Erro Supabase:', error))
      .finally(() => {
        if (mounted) setAuthReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;

    const checkAcquisitionSource = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('acquisition_source')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Erro ao verificar origem de aquisição:', error);
        return;
      }

      if (data?.acquisition_source == null) {
        setAcquisitionModalOpen(true);
      }
    };

    checkAcquisitionSource();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return (
    <Router>
      <AppShell
        session={session}
        bibliaAberta={bibliaAberta}
        setBibliaAberta={setBibliaAberta}
      />
      {session && acquisitionModalOpen && (
        <AcquisitionSourceModal
          session={session}
          onClose={() => setAcquisitionModalOpen(false)}
        />
      )}
      {session && (
        <PlusVitalicioModal
          session={session}
          outroModalAberto={acquisitionModalOpen}
        />
      )}
      <SplashScreen visible={splashVisible} />
    </Router>
  );
}

export default App;
