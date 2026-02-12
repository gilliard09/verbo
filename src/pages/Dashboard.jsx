import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, Plus, Play, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [sermoes, setSermoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSermoes();
  }, []);

  async function fetchSermoes() {
    try {
      const { data, error } = await supabase
        .from('sermoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSermoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar sermões:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto">
      {/* Cabeçalho com Identidade VERBO */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-[#5B2DFF] p-2 rounded-lg">
              <BookOpen size={24} color="#FFFFFF" />
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent tracking-tight">
              VERBO
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-1">O Verbo nasce da Palavra.</p>
        </div>

        <Link 
          to="/editor" 
          className="bg-[#5B2DFF] hover:bg-[#3A1DB8] text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          <Plus size={24} />
        </Link>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar sermão ou tema..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B2DFF] focus:border-transparent outline-none transition-all shadow-sm"
        />
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock size={20} className="text-[#5B2DFF]" />
        Sermões Recentes
      </h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B2DFF]"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sermoes.length > 0 ? (
            sermoes.map((sermao) => (
              <div 
                key={sermao.id} 
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#5B2DFF] transition-colors">
                      {sermao.titulo || 'Sem Título'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-1">
                      {sermao.referencia_biblica || 'Referência não informada'}
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold bg-purple-50 text-[#5B2DFF] px-2 py-1 rounded-md">
                        {sermao.tema || 'Geral'}
                      </span>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/leitura/${sermao.id}`}
                    className="flex items-center gap-2 bg-gray-50 hover:bg-[#5B2DFF] hover:text-white text-gray-600 px-4 py-2 rounded-xl transition-all font-bold text-sm"
                  >
                    <Play size={16} />
                    PREGAR
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500">Nenhum sermão encontrado.</p>
              <Link to="/editor" className="text-[#5B2DFF] font-bold mt-2 inline-block">
                Comece a escrever agora
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;