import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// IMPORTAÇÕES (Verifique se o caminho está correto)
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/Perfil';
import Devocionais from './pages/Devocionais';

// Componente Navbar
const Navbar = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/leitura')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-8">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <span className="text-[10px] font-bold mt-1">Sermões</span>
      </Link>
      
      {/* O "to" precisa bater exatamente com o "path" da Route abaixo */}
      <Link to="/devocional" className={`flex flex-col items-center ${location.pathname === '/devocional' ? 'text-[#5B2DFF]' : 'text-gray-400'}`}>
        <span className="text-[10px] font-bold mt-1">Devocional</span>
      </Link>
      
      {/* ... outros links ... */}
    </nav>
  );
};

function App() {
  const [session, setSession] = useState(null);

  return (
    <Router>
      {!session ? (
        <Routes><Route path="*" element={<Login />} /></Routes>
      ) : (
        <>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devocional" element={<Devocional />} /> {/* <--- A ROTA AQUI */}
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/leitura/:id" element={<Leitura />} />
            <Route path="/perfil" element={<Perfil />} />
          </Routes>
          <Navbar />
        </>
      )}
    </Router>
  );
}

export default App;