import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, Calendar, Loader2, Quote, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

const Devocionais = () => {
  const [devocionalDoDia, setDevocionalDoDia] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarDevocional();
  }, []);

  async function verificarDevocional() {
    try {
      setLoading(true);
      const hoje = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD exato

      // Busca o devocional de hoje usando a nova coluna
      const { data, error } = await supabase
        .from('devocionais')
        .select('*')
        .eq('data_criacao_dia', hoje)
        .maybeSingle();

      if (data) {
        setDevocionalDoDia(data);
      } else {
        // Se não existir, gera um automaticamente
        await gerarNovoDevocional(hoje);
      }
      
      await fetchHistorico(hoje);
    } catch (err) {
      console.error("Erro geral:", err);
    } finally {
      setLoading(false);
    }
  }

  async function gerarNovoDevocional(dataHoje) {
    const textoIA = `📖 *Provérbios 3:5-6*\n\n"Confie no Senhor de todo o seu coração". Como ensinava Charles Spurgeon, a soberania de Deus é o travesseiro onde o cristão descansa a cabeça. John Piper nos lembra que a alegria no Senhor é nossa força. Que sua caminhada hoje seja guiada não pela sua prudência, mas pela dependência total do Espírito.`;

    try {
      const { data, error } = await supabase
        .from('devocionais')
        .insert([{ 
          texto: textoIA, 
          data_criacao_dia: dataHoje,
          is_ia: true 
        }])
        .select()
        .single();

      if (data) setDevocionalDoDia(data);
    } catch (e) {
      console.error("Erro ao inserir:", e);
    }
  }

  async function fetchHistorico(hoje) {
    // Busca tudo que não é de hoje para o histórico
    const { data } = await supabase
      .from('devocionais')
      .select('*')
      .neq('data_criacao_dia', hoje)
      .order('id', { ascending: false }); // Usando ID para ordenar se a data falhar
    
    setHistorico(data || []);
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
      <p className="text-gray-500 font-medium">Sincronizando com o céu...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white p-6 pt-12 shadow-sm border-b border-purple-50">
        <h1 className="text-3xl font-extrabold text-gray-900 font-poppins">Devocionais</h1>
        <div className="flex items-center gap-2 text-purple-600 mt-1">
          <Sparkles size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest italic">Insights Teológicos Diários</span>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Card do Dia */}
        {devocionalDoDia ? (
          <div className="bg-white rounded-3xl shadow-xl border-t-4 border-purple-600 p-6 relative">
            <Quote className="absolute top-4 right-4 text-purple-50 size-16" />
            <div className="relative z-10">
              <div className="bg-purple-100 text-purple-700 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4">
                Hoje • {new Date().toLocaleDateString('pt-BR')}
              </div>
              <p className="text-gray-800 text-lg leading-relaxed italic whitespace-pre-wrap font-serif">
                {devocionalDoDia.texto}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl text-center text-gray-400">
             Toque para carregar a reflexão de hoje.
          </div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="pt-4">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 ml-2">Caminhada Anterior</h3>
            <div className="space-y-3">
              {historico.map(item => (
                <div key={item.id} className="bg-white/60 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="bg-gray-100 p-2 rounded-lg text-gray-400">
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-600 text-sm truncate">{item.texto}</p>
                    <p className="text-[10px] text-gray-400">Reflexão Anterior</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Devocionais;