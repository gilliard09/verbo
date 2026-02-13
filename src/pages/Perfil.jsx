import React from 'react';
import { User, Mail, Shield, LogOut, ChevronRight, Award } from 'lucide-react';

const Perfil = () => {
  // Dados simulados do usuário (Pastores/Empreendedores)
  const usuario = {
    nome: "Jeferson",
    email: "contato@verbo.com.br",
    plano: "Premium"
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
        <h2 className="text-xl font-extrabold text-gray-900">{usuario.nome}</h2>
        <p className="text-gray-500 text-xs">{usuario.email}</p>
      </div>

      {/* Grid de Informações */}
      <div className="grid gap-4">
        {/* Card de Plano */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-[#5B2DFF] transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-[#5B2DFF] rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status da Conta</p>
              <p className="text-sm font-bold text-gray-800">Plano {usuario.plano}</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-[#5B2DFF]" />
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="flex items-center gap-3 text-gray-700">
              <Shield size={18} />
              <span className="text-sm font-medium">Segurança e Senha</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
          
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 text-gray-700">
              <Mail size={18} />
              <span className="text-sm font-medium">Suporte Técnica</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* Botão Sair */}
        <button className="mt-4 w-full p-4 flex items-center justify-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
          <LogOut size={18} />
          Sair do Verbo
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[10px] text-gray-400 font-medium">VERBO v1.0.0</p>
        <p className="text-[10px] text-gray-300 italic">O Verbo nasce da Palavra.</p>
      </div>
    </div>
  );
};

export default Perfil;