import { useState } from 'react';

export const useAdminDashboardState = () => {
  const [aba, setAba] = useState('analytics');
  const [modal, setModal] = useState({ aberto: false, titulo: '', descricao: '', onConfirmar: null });

  return { aba, setAba, modal, setModal };
};
