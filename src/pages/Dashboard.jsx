import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Play, Clock, Search, Edit2, Trash2 } from 'lucide-react';
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

  async function deleteSermao(id) {
    if (window.confirm('Tem certeza que deseja excluir este sermão permanentemente?')) {
      try {
        const { error } = await supabase.from('sermoes').delete().eq('id', id);
        if (error) throw error;
        setSermoes(sermoes.filter(s => s.id !== id));
      } catch (error) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  }

  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto">
      {/* Cabeçalho Ajustado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {/* Logo oficial vindo da pasta public */}
            <img src="/logo.png" alt="Logo VERBO" className="w-10 h-10 rounded-lg shadow-sm" />
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent tracking-tight">
              VERBO
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-1">O Verbo nasce da Palavra.</p>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar sermão ou tema..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B2DFF] outline-none shadow-sm"
        />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock size={18} className="text-[#5B2DFF]" />
        Sermões Recentes
      </h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B2DFF]"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sermoes.map((sermao) => (
            <div key={sermao.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 group-hover:text-[#5B2DFF] transition-colors">
                    {sermao.titulo || 'Sem Título'}
                  </h3>
                  <p className="text-gray-500 text-xs mb-3">
                    {sermao.referencia_biblica || 'Referência não informada'} • <span className="text-[#5B2DFF] font-semibold">{sermao.tema || 'Geral'}</span>
                  </p>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-3 mt-2">
                    <Link 
                      to={`/leitura/${sermao.id}`}
                      className="flex items-center gap-2 bg-[#5B2DFF] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#3A1DB8] transition-colors"
                    >
                      <Play size={14} /> PREGAR
                    </Link>
                    
                    <Link 
                      to={`/editor/${sermao.id}`}
                      className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-2 rounded-lg font-bold text-xs hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 size={14} /> EDITAR
                    </Link>

                    <button 
                      onClick={() => deleteSermao(sermao.id)}
                      className="flex items-center gap-2 bg-red-50 text-red-500 px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;