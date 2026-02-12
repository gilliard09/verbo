import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importação das suas páginas
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/perfil'; // Página que criamos agora

// Importação do componente de navegação
import Tabs from './components/Tabs';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Área de conteúdo que muda conforme a rota */}
        <Routes>
          {/* Rota Principal: Lista de Sermões */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Rotas de Criação e Edição */}
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          
          {/* Rota do Modo Púlpito (Leitura) */}
          <Route path="/leitura/:id" element={<Leitura />} />
          
          {/* Rota do Perfil do Pastor */}
          <Route path="/perfil" element={<Perfil />} />
          
          {/* Rota para Devocionais (que faremos a seguir) */}
          <Route path="/devocionais" element={<div className="p-10 text-center">Em breve: Devocionais</div>} />
        </Routes>

        {/* O componente Tabs fica fora das Routes para que 
          ele apareça fixo em todas as telas principais 
        */}
        <Tabs />
      </div>
    </BrowserRouter>
  );
}

export default App;