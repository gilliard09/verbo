import { supabase } from '../../../supabaseClient';

export const fetchAdminCounts = async () => {
  const [{ count: totalUsuarios }, { count: totalSermoes }, { count: totalAssinaturas }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('sermoes').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).in('plano', ['fundador', 'plus']),
  ]);

  return { totalUsuarios: totalUsuarios || 0, totalSermoes: totalSermoes || 0, totalAssinaturas: totalAssinaturas || 0 };
};
