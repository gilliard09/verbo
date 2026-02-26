import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Seleciona o elemento root do seu index.html
const rootElement = document.getElementById('root');

// Verifica se o elemento existe para evitar erros fatais no console
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error("Não foi possível encontrar o elemento 'root' no index.html. Verifique seu arquivo HTML.");
}