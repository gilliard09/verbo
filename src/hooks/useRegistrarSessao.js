/**
 * useRegistrarSessao.js
 * 
 * Registra uma sessão na tabela `sessoes` uma vez por hora por usuário.
 * Usado para calcular DAU e WAU reais no AdminDashboard.
 * 
 * Cole esse hook no seu componente raiz (App.jsx ou Layout principal).
 */

import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SESSAO_KEY = 'verbo_ultima_sessao';

export function useRegistrarSessao() {
  useEffect(() => {
    const registrar = async () => {
      try {
        // Evita registrar mais de uma vez por hora
        const ultima = localStorage.getItem(SESSAO_KEY);
        if (ultima) {
          const diff = (Date.now() - new Date(ultima)) / 1000 / 60; // minutos
          if (diff < 60) return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error } = await supabase
          .from('sessoes')
          .insert({ user_id: session.user.id });

        if (!error) {
          localStorage.setItem(SESSAO_KEY, new Date().toISOString());
        }
      } catch {
        // silencioso — não afeta o usuário
      }
    };

    registrar();
  }, []);
}