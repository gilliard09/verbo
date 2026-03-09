import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import {
  PlayCircle, Lock, ChevronRight, Loader2,
  ShoppingCart, CheckCircle, Award, BookOpen,
  ChevronDown, AlertTriangle, RefreshCw
} from 'lucide-react';

const Cursos = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(new Set());

  const carregarDados = async () => {
    setLoading(true);
    setErro(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Cursos + contagem de aulas em paralelo
      const [
        { data: todosCursos, error: errCursos },
        { data: minhasMatriculas },
        { data: progresso },
        { data: contagemAulas }
      ] = await Promise.all([
        supabase.from('cursos').select('*').order('created_at', { ascending: true }),
        supabase.from('matriculas').select('curso_id').eq('user_id', user?.id),
        supabase.from('progresso_aulas')
          .select('aula_id, aulas!inner(curso_id)')
          .eq('user_id', user?.id),
        supabase.from('aulas').select('curso_id')
      ]);

      if (errCursos) throw errCursos;

      const idsComAcesso = new Set(minhasMatriculas?.map(m => m.curso_id));

      // Aulas por curso
      const aulasPorCurso = (contagemAulas || []).reduce((acc, a) => {
        acc[a.curso_id] = (acc[a.curso_id] || 0) + 1;
        return acc;
      }, {});

      // Progresso por curso
      const progressoPorCurso = (progresso || []).reduce((acc, p) => {
        const cursoId = p.aulas?.curso_id;
        if (cursoId) acc[cursoId] = (acc[cursoId] || 0) + 1;
        return acc;
      }, {});

      const cursosFormatados = (todosCursos || []).map(c => {
        const totalAulas = aulasPorCurso[c.id] || 0;
        const aulasFeitas = progressoPorCurso[c.id] || 0;
        const porcentagem = totalAulas > 0 ? Math.round((aulasFeitas / totalAulas) * 100) : 0;
        return {
          ...c,
          acesso: idsComAcesso.has(c.id),
          totalAulas,
          aulasFeitas,
          porcentagem,
          concluido: totalAulas > 0 && aulasFeitas >= totalAulas
        };
      });

      // 5. Ordenação: com acesso primeiro, depois bloqueados
      cursosFormatados.sort((a, b) => {
        if (a.acesso && !b.acesso) return -1;
        if (!a.acesso && b.acesso) return 1;
        return 0;
      });

      setCursos(cursosFormatados);
    } catch (error) {
      console.error("Erro ao carregar academia:", error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleDescricao = (id) => {
    setDescricaoExpandida(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  // ─── Erro ────────────────────────────────────────────────────────────────────
  if (erro) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-[24px] flex items-center justify-center">
        <AlertTriangle className="text-red-400" size={28} />
      </div>
      <div>
        <p className="font-black text-slate-700 uppercase text-sm tracking-tight">Erro ao carregar</p>
        <p className="text-slate-400 text-xs mt-1">Verifique sua conexão e tente novamente.</p>
      </div>
      <button
        onClick={carregarDados}
        className="flex items-center gap-2 px-6 py-3 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg"
      >
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="p-6 pb-28 max-w-2xl mx-auto">
      <header className="mb-8 mt-2">
        <h1 className="text-2xl font-black tracking-tight uppercase text-slate-800">Academia Verbo</h1>
        <p className="text-gray-400 text-sm mt-1">Sua formação ministerial descomplicada.</p>
      </header>

      {cursos.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-gray-100 rounded-[32px]">
          <BookOpen className="text-slate-200 mx-auto mb-3" size={36} />
          <p className="text-gray-400 text-sm font-bold">Nenhum curso disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cursos.map((curso) => {
            const expandida = descricaoExpandida.has(curso.id);

            return (
              <div
                key={curso.id}
                className={`relative overflow-hidden rounded-[28px] border transition-all duration-300 ${
                  curso.concluido
                    ? 'border-green-100 bg-green-50/30'
                    : curso.acesso
                      ? 'border-slate-100 bg-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {/* Badge concluído */}
                {curso.concluido && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                    <CheckCircle size={10} /> Concluído
                  </div>
                )}

                <div className="flex gap-4 p-4">
                  {/* Capa */}
                  <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#5B2DFF] to-[#D946EF] flex items-center justify-center">
                    {curso.thumb_url || curso.capa_url ? (
                      <img
                        src={curso.thumb_url || curso.capa_url}
                        alt={curso.titulo}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-white font-black text-2xl opacity-60">
                        {curso.titulo?.charAt(0) || 'V'}
                      </span>
                    )}
                    {!curso.acesso && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                        <Lock size={18} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 leading-tight mb-1 text-sm">{curso.titulo}</h3>

                    {/* Contagem de aulas */}
                    {curso.totalAulas > 0 && (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">
                        {curso.totalAulas} aula{curso.totalAulas !== 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Descrição expansível */}
                    {curso.descricao && (
                      <button
                        onClick={() => toggleDescricao(curso.id)}
                        className="text-left"
                      >
                        <p className={`text-[11px] text-gray-500 leading-relaxed transition-all ${expandida ? '' : 'line-clamp-2'}`}>
                          {curso.descricao}
                        </p>
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-[#5B2DFF] uppercase tracking-widest mt-1">
                          {expandida ? 'Ver menos' : 'Ver mais'}
                          <ChevronDown size={10} className={`transition-transform ${expandida ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                    )}

                    {/* Progresso — só para quem tem acesso e não concluiu */}
                    {curso.acesso && curso.totalAulas > 0 && !curso.concluido && (
                      <div className="mt-2.5 space-y-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#5B2DFF] to-[#8B5CF6] rounded-full transition-all duration-700"
                            style={{ width: `${curso.porcentagem}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                          {curso.aulasFeitas}/{curso.totalAulas} aulas · {curso.porcentagem}%
                        </p>
                      </div>
                    )}

                    {/* Status label */}
                    {!curso.acesso && (
                      <span className="text-[10px] text-slate-300 font-bold mt-1.5">Conteúdo bloqueado</span>
                    )}
                  </div>

                  {/* Ação */}
                  <div className="flex flex-col items-center justify-center gap-2 shrink-0">
                    {curso.acesso ? (
                      <>
                        <Link
                          to={`/cursos/${curso.id}`}
                          className="p-2.5 bg-purple-50 text-[#5B2DFF] rounded-full hover:bg-purple-100 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </Link>
                        {/* Certificado se concluído */}
                        {curso.concluido && (
                          <Link
                            to={`/cursos/${curso.id}`}
                            className="p-2 bg-green-50 text-green-500 rounded-full hover:bg-green-100 transition-colors"
                            title="Ver certificado"
                          >
                            <Award size={16} />
                          </Link>
                        )}
                      </>
                    ) : (
                      <a
                        href={curso.checkout_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-[#5B2DFF] text-white text-[10px] font-black rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#4a22e0] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ShoppingCart size={12} /> LIBERAR
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cursos;