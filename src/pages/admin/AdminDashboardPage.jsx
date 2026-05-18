import React from 'react';
import AdminHeader from './components/AdminHeader';
import AdminTabs from './components/AdminTabs';
import { useAdminDashboardState } from './hooks/useAdminDashboardState';
import { useAdminAnalytics } from './hooks/useAdminAnalytics';

const AdminDashboardPage = () => {
  const { aba, setAba } = useAdminDashboardState();
  const { stats, loadingAnalytics } = useAdminAnalytics();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <AdminTabs aba={aba} setAba={setAba} />

        {aba === 'analytics' && (
          <section className="bg-white rounded-3xl p-6 border border-slate-100">
            <h2 className="font-black text-slate-800 uppercase text-sm mb-4">Resumo</h2>
            {loadingAnalytics ? (
              <p className="text-slate-400 text-sm">Carregando analytics...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-purple-50 p-4">
                  <p className="text-xs font-black text-purple-500 uppercase">Usuários</p>
                  <p className="text-3xl font-black text-slate-800">{stats.totalUsuarios}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-black text-blue-500 uppercase">Sermões</p>
                  <p className="text-3xl font-black text-slate-800">{stats.totalSermoes}</p>
                </div>
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-xs font-black text-green-500 uppercase">Assinaturas</p>
                  <p className="text-3xl font-black text-slate-800">{stats.totalAssinaturas}</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
