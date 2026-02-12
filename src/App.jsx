import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importação das suas páginas
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Leitura from './pages/Leitura';
import Perfil from './pages/Perfil';
import Devocionais from './pages/Devocionais';

// Importação do componente de navegação
import Tabs from './components/Tabs';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* O componente Tabs fica no topo para aparecer fixo em todas as telas */}
        <Tabs />
        
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
          
          {/* Rota para Devocionais */}
          <Route path="/devocionais" element={<Devocionais />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;