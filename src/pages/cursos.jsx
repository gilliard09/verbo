import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { PlayCircle, Lock, ChevronRight, BookOpen, Loader2, ShoppingCart } from 'lucide-react';

const Cursos = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // 1. Busca todos os cursos (Usando created_at que é o padrão do Supabase)
        const { data: todosCursos, error: errCursos } = await supabase
          .from('cursos')
          .select('*')
          .order('created_at', { ascending: true }); // Ajustado de 'criado_em' para 'created_at'

        if (errCursos) throw errCursos;

        // 2. Busca as matrículas
        const { data: minhasMatriculas } = await supabase
          .from('matriculas')
          .select('curso_id')
          .eq('user_id', user?.id);

        const idsComAcesso = new Set(minhasMatriculas?.map(m => m.curso_id));

        // 3. Mapeia incluindo a lógica de acesso
        const cursosFormatados = todosCursos.map(c => ({
          ...c,
          acesso: idsComAcesso.has(c.id)
        }));

        setCursos(cursosFormatados);
      } catch (error) {
        console.error("Erro ao carregar academia:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-black tracking-tight uppercase">Academia Verbo</h1>
        <p className="text-gray-500 text-sm">Sua formação ministerial descomplicada.</p>
      </header>

      <div className="space-y-6">
        {cursos.length === 0 ? (
          <div className="text-center p-10 border-2 border-dashed border-gray-100 rounded-[32px]">
            <p className="text-gray-400 text-sm">Nenhum curso disponível no momento.</p>
          </div>
        ) : (
          cursos.map((curso) => (
            <div 
              key={curso.id} 
              className={`relative overflow-hidden rounded-[32px] border transition-all ${curso.acesso ? 'border-gray-100 bg-white shadow-sm' : 'border-gray-200 bg-gray-50/50'}`}
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-200">
                  <img 
                    src={curso.thumb_url || curso.capa_url || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=400'} 
                    alt={curso.titulo} 
                    className="w-full h-full object-cover" 
                  />
                  {!curso.acesso && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white backdrop-blur-[2px]">
                      <Lock size={18} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center flex-1">
                  <h3 className="font-bold text-slate-800 leading-tight mb-1">{curso.titulo}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">{curso.descricao}</p>
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#5B2DFF]">
                    {curso.acesso ? (
                      <span className="flex items-center gap-1"><PlayCircle size={12}/> Assistir Aulas</span>
                    ) : (
                      <span className="text-gray-400">Conteúdo Bloqueado</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  {curso.acesso ? (
                    <Link 
                      to={`/cursos/${curso.id}`}
                      className="p-2 bg-purple-50 text-[#5B2DFF] rounded-full hover:bg-purple-100 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </Link>
                  ) : (
                    /* AQUI ESTÁ A MUDANÇA: Link dinâmico do banco de dados */
                    <a 
                      href={curso.checkout_url || "https://pay.hotmart.com/V93818610J"} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#5B2DFF] text-white text-[10px] font-black rounded-full shadow-lg shadow-purple-100 hover:scale-105 transition-transform text-center flex items-center gap-2"
                    >
                      <ShoppingCart size={12} /> LIBERAR
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Card Comunidade */}
      <div className="mt-10 p-6 bg-slate-900 rounded-[32px] text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Exclusivo Alunos</span>
           <h4 className="text-lg font-bold mt-1 tracking-tight">Comunidade VIP no WhatsApp</h4>
           <button 
             onClick={() => window.open('https://chat.whatsapp.com/FeN23j5E7rhDtmKlrzo6yv?mode=hqctcli', '_blank')}
             className="mt-4 text-[12px] font-black bg-white text-slate-900 px-6 py-2 rounded-full hover:bg-purple-50 transition-colors"
           >
             ACESSAR GRUPO
           </button>
        </div>
        <BookOpen className="absolute -right-4 -bottom-4 text-white/5" size={120} />
      </div>
    </div>
  );
};

export default Cursos;