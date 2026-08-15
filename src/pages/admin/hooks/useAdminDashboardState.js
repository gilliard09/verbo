import { useState } from 'react';

// Estado de navegação do painel admin (qual aba está ativa) e do modal de
// confirmação genérico (usado para excluir curso/aula/devocional/etc).
// Mantido simples de propósito — não faz chamadas de rede, só guarda estado.
export const useAdminDashboardState = () => {
  const [aba, setAba] = useState('analytics');
  const [modal, setModal] = useState({
    aberto: false,
    titulo: '',
    descricao: '',
    onConfirmar: null,
  });

  return { aba, setAba, modal, setModal };
};