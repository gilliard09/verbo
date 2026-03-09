import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const RotaAdmin = ({ children }) => {
  const [status, setStatus] = useState('verificando');

  useEffect(() => {
    const verificar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('negado'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setStatus(profile?.role === 'admin' ? 'admin' : 'negado');
    };
    verificar();
  }, []);

  if (status === 'verificando') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
    </div>
  );

  if (status === 'negado') return <Navigate to="/" replace />;

  return children;
};

export default RotaAdmin;