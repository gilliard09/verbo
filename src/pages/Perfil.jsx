import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, LogOut, ChevronRight, ShieldCheck, Settings } from 'lucide-react';

const Perfil = () => {
  const [perfil, setPerfil] = useState({ nome: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;

      if (user) {
        setPerfil({
          // Busca o nome que configuramos no Cadastro (user_metadata)
          nome: user.user_metadata?.full_name || 'Pregador',
          email: user.email,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    const confirmacao = window.confirm("Deseja realmente sair do app?");
    if (confirmacao) {
      await supabase.auth.signOut();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#5B2DFF]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      {/* Cabeçalho do Perfil */}
      <header className="flex flex-col items-center mt-8 mb-10">
        <div className="w-24 h-24 bg-gradient-to-tr from-[#5B2DFF] to-[#D946EF] rounded-[32px] flex items-center justify-center shadow-xl shadow-purple-100 mb-4 border-4 border-white">
          <span className="text-3xl font-black text-white uppercase">
            {perfil.nome.charAt(0)}
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-800">{perfil.nome}</h1>
        <p className="text-sm font-medium text-gray-400">{perfil.email}</p>
      </header>

      {/* Menu de Opções */}
      <div className="space-y-4 max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-50">
          
          {/* Dados da Conta */}
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <User size={20} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Dados da Conta</span>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-slate-400" />
          </div>

          {/* Segurança */}
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-50 text-green-500 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Segurança</span>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-slate-400" />
          </div>

          {/* Configurações */}
          <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-50 text-[#5B2DFF] rounded-xl">
                <Settings size={20} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Configurações do App</span>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-slate-400" />
          </div>

        </div>

        {/* Botão Sair */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-5 bg-red-50 text-red-500 rounded-3xl font-bold text-sm hover:bg-red-100 transition-colors active:scale-95"
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>

      {/* Rodapé de Versão */}
      <div className="text-center mt-12">
        <p className="text-[10px] font-black text-gray-200 uppercase tracking-[4px]">Verbo v1.0.0</p>
      </div>
    </div>
  );
};

export default Perfil;