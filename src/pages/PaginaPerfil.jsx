import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  User, Settings, Info, LogOut, 
  BookOpen, Flame, ChevronRight, Mail, ExternalLink 
} from 'lucide-react';

const Perfil = () => {
  const navigate = useNavigate();
  const [totalSermoes, setTotalSermoes] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Informações do Pastor Jeferson
  const user = {
    nome: "Jeferson Rocha",
    email: "contato@jefersonrocha.com",
    foto: "https://github.com/jefersonrocha.png", // Sua foto
    bio: "Pastor e Empreendedor"
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        // Conta quantos sermões existem na sua tabela
        const { count, error } = await supabase
          .from('sermoes')
          .select('*', { count: 'exact', head: true });
        
        if (!error) setTotalSermoes(count || 0);
      } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleLogout = () => {
    // Simulação de saída - volta para o Dashboard por enquanto
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Cabeçalho do Perfil */}
      <div className="bg-white p-8 pt-16 border-b border-gray-100 flex flex-col items-center">
        <div className="relative">
          <img 
            src={user.foto} 
            alt="Perfil" 
            className="w-28 h-28 rounded-full border-4 border-purple-100 shadow-md object-cover"
          />
          <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-800">{user.nome}</h2>
        <p className="text-purple-600 font-semibold text-sm uppercase tracking-widest">{user.bio}</p>
      </div>

      {/* Cards de Estatísticas Reais */}
      <div className="grid grid-cols-2 gap-4 p-6 -mt-6">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="bg-purple-100 p-3 rounded-2xl text-purple-600 mb-3">
            <BookOpen size={24} />
          </div>
          <span className="text-3xl font-black text-gray-800">
            {loading ? "..." : totalSermoes}
          </span>
          <span className="text-[10px] text-gray-400 uppercase font-bold mt-1">Sermões</span>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 mb-3">
            <Flame size={24} />
          </div>
          <span className="text-3xl font-black text-gray-800">7</span>
          <span className="text-[10px] text-gray-400 uppercase font-bold mt-1">Dias Seguidos</span>
        </div>
      </div>

      {/* Menu de Opções */}
      <div className="px-6 space-y-3">
        <button className="w-full bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 active:scale-95 transition-all">
          <div className="flex items-center gap-4 text-gray-700">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-500">
              <User size={20} />
            </div>
            <span className="font-bold text-gray-600">Minha Conta</span>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        <button 
          onClick={() => window.open('https://seusite.com.br', '_blank')}
          className="w-full bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4 text-gray-700">
            <div className="bg-green-50 p-2 rounded-lg text-green-500">
              <ExternalLink size={20} />
            </div>
            <span className="font-bold text-gray-600">Curso Pregadores</span>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        <button 
          onClick={() => alert("Pregue Mais v1.0\nFoco, Fé e Tecnologia.")}
          className="w-full bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4 text-gray-700">
            <div className="bg-gray-50 p-2 rounded-lg text-gray-400">
              <Info size={20} />
            </div>
            <span className="font-bold text-gray-600">Sobre o App</span>
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>

        <button 
          onClick={handleLogout}
          className="w-full p-5 flex items-center justify-center gap-2 text-red-400 font-bold mt-4"
        >
          <LogOut size={20} />
          Sair do Aplicativo
        </button>
      </div>
    </div>
  );
};

export default Perfil;