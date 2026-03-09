// components/BotaoOffline.jsx
// Botão reutilizável para salvar/remover sermão do cache offline
// Uso: <BotaoOffline sermao={sermao} />

import React, { useState, useEffect } from 'react';
import { WifiOff, Download, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { salvarOffline, removerOffline, buscarOffline } from '../hooks/useOfflineSermons';

const BotaoOffline = ({ sermao, className = '' }) => {
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checando, setChecando] = useState(true);

  // Verifica se já está salvo ao montar
  useEffect(() => {
    if (!sermao?.id) return;
    buscarOffline(sermao.id)
      .then(result => setSalvo(!!result))
      .catch(() => setSalvo(false))
      .finally(() => setChecando(false));
  }, [sermao?.id]);

  const toggleOffline = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (salvo) {
        await removerOffline(sermao.id);
        setSalvo(false);
      } else {
        await salvarOffline(sermao);
        setSalvo(true);
      }
    } catch (err) {
      console.error('Erro ao salvar offline:', err);
    } finally {
      setLoading(false);
    }
  };

  if (checando) return null;

  return (
    <button
      onClick={toggleOffline}
      title={salvo ? 'Remover do cache offline' : 'Salvar para ler sem internet'}
      className={`flex items-center gap-1.5 transition-all active:scale-95 ${className}`}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin text-slate-300" />
      ) : salvo ? (
        <>
          <CheckCircle2 size={15} className="text-green-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-green-500">Offline</span>
        </>
      ) : (
        <>
          <Download size={15} className="text-slate-300 group-hover:text-[#5B2DFF]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Salvar</span>
        </>
      )}
    </button>
  );
};

export default BotaoOffline;