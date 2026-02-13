import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Sparkles, ScrollText, Clock, Trash2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [saudacao, setSaudacao] = useState('Olá');
  const [sermoes, setSermoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const nomeCompleto = user.user_metadata?.full_name || 'Pregador';
        const hora = new Date().getHours();
        let periodo = "Bom dia";
        if (hora >= 12 && hora < 18) periodo = "Boa tarde";
        if (hora >= 18 || hora < 5) periodo = "Boa noite";

        // Substitua pelo seu e-mail para ativar o prefixo Pastor
        const ehPastor = user.email === 'jefersonrocha998@gmail.com'; 
        setSaudacao(`${periodo}, ${ehPastor ? 'Pastor ' : ''}${nomeCompleto.split(' ')[0]}`);
      }

      const { data } = await supabase
        .from('sermoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setSermoes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function excluirSermao(id, e) {
    e.stopPropagation(); 
    if (window.confirm("Deseja excluir esta mensagem permanentemente?")) {
      const { error } = await supabase.from('sermoes').delete().eq('id', id);
      if (!error) {
        // Feedback visual removendo o item da lista
        setSermoes(sermoes.filter(s => s.id !== id));
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      {/* HEADER LIMPO */}
      <header className="mt-10 mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">
          {saudacao} <Sparkles className="inline text-yellow-400 mb-1" size={24} />
        </h1>
        <p className="text-gray-400 font-medium text-sm">
          {sermoes.length === 0 ? "Nenhuma mensagem preparada." : `Você tem ${sermoes.length} mensagens salvas.`}
        </p>
      </header>

      {/* LISTA DE SERMÕES */}
      <section>
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
          <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[3px] opacity-40">Suas Mensagens</h3>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-[28px]" />)}
            </div>
          ) : (
            sermoes.map((sermao) => (
              <div 
                key={sermao.id}
                onClick={() => navigate(`/leitura/${sermao.id}`)}
                className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-[#5B2DFF] group-hover:text-white transition-colors">
                    <ScrollText size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-700 text-sm line-clamp-1">{sermao.titulo}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1">
                      <Clock size={12} />
                      {new Date(sermao.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO COM ANIMAÇÃO */}
                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/editor/${sermao.id}`);
                    }}
                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:scale-90 transition-all"
                    title="Editar"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={(e) => excluirSermao(sermao.id, e)}
                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 active:scale-90 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;