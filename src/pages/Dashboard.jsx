import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Sparkles, Plus, BookOpen, ScrollText, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');
  const [sermoes, setSermoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function carregarDadosIniciais() {
    try {
      // 1. Pegar dados do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const nomeCompleto = user.user_metadata?.full_name || 'Pregador';
        const primeiroNome = nomeCompleto.split(' ')[0];
        
        // Lógica de Saudação por Horário
        const hora = new Date().getHours();
        let textoSaudacao = "Bom dia";
        if (hora >= 12 && hora < 18) textoSaudacao = "Boa tarde";
        if (hora >= 18 || hora < 5) textoSaudacao = "Boa noite";

        // Personalização para o seu perfil (Pastor)
        // Substitua 'seu-email@teste.com' pelo seu e-mail real do cadastro
        const ehPastor = user.email === 'seu-email-aqui@gmail.com'; 
        const saudacaoFinal = ehPastor 
          ? `${textoSaudacao}, Pastor ${primeiroNome}` 
          : `${textoSaudacao}, ${primeiroNome}`;
        
        setSaudacao(saudacaoFinal);
        setNome(primeiroNome);
      }

      // 2. Carregar a lista de sermões recente
      const { data } = await supabase
        .from('sermoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setSermoes(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      {/* HEADER PERSONALIZADO */}
      <header className="mt-8 mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-[3px] text-[#5B2DFF] opacity-60">
            Painel do Pregador
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-tight">
          {saudacao} <Sparkles className="inline text-yellow-400 mb-1" size={24} />
        </h1>
        <p className="text-gray-400 font-medium text-sm">
          {sermoes.length > 0 
            ? `Você tem ${sermoes.length} sermões preparados.` 
            : "Pronto para escrever sua próxima mensagem?"}
        </p>
      </header>

      {/* AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <button 
          onClick={() => navigate('/editor')}
          className="bg-[#5B2DFF] p-6 rounded-[32px] text-white shadow-lg shadow-purple-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={28} />
          <span className="font-bold text-xs uppercase tracking-widest">Novo Sermão</span>
        </button>
        
        <button 
          onClick={() => navigate('/devocional')}
          className="bg-white p-6 rounded-[32px] text-slate-700 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <BookOpen size={28} className="text-[#5B2DFF]" />
          <span className="font-bold text-xs uppercase tracking-widest">Devocionais</span>
        </button>
      </div>

      {/* LISTA DE SERMÕES RECENTES */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Sermões Recentes</h3>
          <ScrollText size={18} className="text-gray-300" />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-3xl" />)}
            </div>
          ) : sermoes.length > 0 ? (
            sermoes.map((sermao) => (
              <div 
                key={sermao.id}
                onClick={() => navigate(`/leitura/${sermao.id}`)}
                className="bg-white p-5 rounded-[28px] border border-gray-50 shadow-sm flex items-center justify-between group active:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#5B2DFF] group-hover:text-white transition-colors">
                    <ScrollText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm line-clamp-1">{sermao.titulo}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1">
                      <Clock size={12} />
                      {new Date(sermao.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhum sermão encontrado</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;