import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Trash2, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [sermoes, setSermoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState(null);
  const navigate = useNavigate();

  // Busca os sermões ao carregar a página
  useEffect(() => {
    fetchSermoes();
  }, []);

  async function fetchSermoes() {
    try {
      setLoading(true);
      setErro(null);

      // Busca simples sem .order('created_at') para evitar o erro de coluna inexistente
      const { data, error } = await supabase
        .from('sermoes')
        .select('*');

      if (error) throw error;

      setSermoes(data || []);
      
    } catch (error) {
      console.error('Erro ao carregar:', error.message);
      setErro("Erro de conexão com o banco de dados.");
    } finally {
      setLoading(false);
    }
  }

  async function deletarSermao(id, e) {
    e.stopPropagation();
    if (window.confirm('Deseja excluir este sermão permanentemente?')) {
      const { error } = await supabase.from('sermoes').delete().eq('id', id);
      if (!error) fetchSermoes();
    }
  }

  // Filtro de busca em tempo real
  const sermoesFiltrados = sermoes.filter(s => 
    s.titulo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header Fixo no Topo */}
      <header className="bg-white p-6 pt-12 shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Meus Sermões</h1>
        <p className="text-gray-500 mb-6">{sermoes.length} rascunhos salvos</p>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar sermão..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-gray-700"
          />
        </div>
      </header>

      {/* Listagem de Cards */}
      <main className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="font-medium">Buscando seus esboços...</p>
          </div>
        ) : erro ? (
          <div className="bg-red-50 p-6 rounded-2xl text-red-600 text-center">
            <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-bold">{erro}</p>
            <button onClick={fetchSermoes} className="mt-4 underline font-semibold">Tentar novamente</button>
          </div>
        ) : sermoesFiltrados.length > 0 ? (
          <div className="space-y-4">
            {sermoesFiltrados.map((sermao) => (
              <div 
                key={sermao.id}
                onClick={() => navigate(`/editor/${sermao.id}`)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all"
              >
                {/* Lado Esquerdo: Informações */}
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-gray-800 text-lg truncate leading-tight">
                    {sermao.titulo || "Sermão sem título"}
                  </h3>
                  <p className="text-[10px] text-purple-500 uppercase font-bold tracking-widest mt-1">
                    Toque para editar
                  </p>
                </div>
                
                {/* Lado Direito: Ações (Modo Púlpito e Lixeira) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/leitura/${sermao.id}`);
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-[#6D28D9] text-white rounded-xl shadow-lg active:scale-90 transition-transform"
                    title="Modo Púlpito"
                  >
                    <BookOpen size={24} />
                  </button>

                  <button 
                    onClick={(e) => deletarSermao(sermao.id, e)}
                    className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 active:scale-90 transition-transform"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-10">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-gray-300" size={30} />
            </div>
            <p className="text-gray-400 font-medium">Você ainda não tem sermões. Comece um novo no botão abaixo!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;