import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Shield, LogOut, ChevronRight, Award } from 'lucide-react';

const Perfil = () => {
  const [usuario, setUsuario] = useState({ nome: "Usuário", email: "" });

  useEffect(() => {
    // Busca os dados reais do usuário logado
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuario({
          nome: user.email.split('@')[0], // Pega o nome antes do @ como apelido
          email: user.email,
          plano: "Premium"
        });
      }
    };
    getUserData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("Erro ao sair: " + error.message);
  };

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto">
      {/* Cabeçalho do Perfil */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-[#5B2DFF] to-[#3A1DB8] rounded-full flex items-center justify-center text-white shadow-lg">
            <User size={40} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white"></div>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 capitalize">{usuario.nome}</h2>
        <p className="text-gray-500 text-xs">{usuario.email}</p>
      </div>

      <div className="grid gap-4">
        {/* Card de Plano */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-[#5B2DFF] rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Status da Conta</p>
              <p className="text-sm font-bold text-gray-800">Plano {usuario.plano}</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button className="w-full p-4 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-3 text-gray-700">
              <Shield size={18} />
              <span className="text-sm font-medium">Segurança</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          
          <button className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-700">
              <Mail size={18} />
              <span className="text-sm font-medium">Suporte</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* Botão Sair com Função Real */}
        <button 
          onClick={handleLogout}
          className="mt-4 w-full p-4 flex items-center justify-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          Sair do Verbo
        </button>
      </div>

      <div className="mt-8 text-center opacity-30">
        <p className="text-[10px] font-bold">VERBO v1.1.0</p>
        <p className="text-[10px] italic">O Verbo nasce da Palavra.</p>
      </div>
    </div>
  );
};

export default Perfil;