import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';
import {
  ArrowLeft, BookOpen, CheckCircle, ChevronRight, Lock,
  Loader2, PlayCircle
} from 'lucide-react';

const Curso = () => {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { temAcessoCurso, loading: loadingPlano } = usePlano();

  const [curso, setCurso] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [temMatricula, setTemMatricula] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregarCurso();
  }, [cursoId]);

  const carregarCurso = async () => {
    setLoading(true);
    setErro(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [
        { data: cursoBD, error: erroCurso },
        { data: matricula },
        { data: materiasBD, error: erroMaterias },
        { data: progresso },
        { data: avaliacoesBD, error: erroAvaliacoes },
        { data: tentativasBD, error: erroTentativas }
      ] = await Promise.all([
        supabase.from('cursos').select('*').eq('id', cursoId).single(),
        supabase.from('matriculas').select('status')
          .eq('user_id', user?.id).eq('curso_id', cursoId).maybeSingle(),
        supabase.from('materias').select('*')
          .eq('curso_id', cursoId).order('ordem', { ascending: true }),
        supabase.from('progresso_aulas')
          .select('aula_id, aulas!inner(materia_id, curso_id)')
          .eq('user_id', user?.id)
          .eq('aulas.curso_id', cursoId),
        supabase.from('avaliacoes').select('id,materia_id,titulo,nota_minima,ativa').eq('ativa', true),
        supabase.from('tentativas_avaliacao').select('avaliacao_id,nota,aprovado,concluida_em').eq('user_id', user?.id).order('concluida_em', { ascending: false })
      ]);

      if (erroCurso) throw erroCurso;
      if (erroMaterias) throw erroMaterias;
      if (erroAvaliacoes) throw erroAvaliacoes;
      if (erroTentativas) throw erroTentativas;

      setCurso(cursoBD);
      setTemMatricula(matricula?.status === 'ativo');
      setAvaliacoes(avaliacoesBD || []);

      const progressoPorMateria = (progresso || []).reduce((acc, item) => {
        const materiaId = item.aulas?.materia_id;
        if (materiaId) acc[materiaId] = (acc[materiaId] || 0) + 1;
        return acc;
      }, {});

      const materiasComAulas = await Promise.all(
        (materiasBD || []).map(async materia => {
          const { data: aulas, error } = await supabase
            .from('aulas')
            .select('id')
            .eq('materia_id', materia.id)
            .order('ordem', { ascending: true });

          if (error) throw error;

          const totalAulas = aulas?.length || 0;
          const aulasFeitas = Math.min(progressoPorMateria[materia.id] || 0, totalAulas);
          const porcentagem = totalAulas > 0
            ? Math.round((aulasFeitas / totalAulas) * 100)
            : 0;

          const avaliacao = (avaliacoesBD || []).find(a => a.materia_id === materia.id) || null;
          const ultimaTentativa = avaliacao
            ? (tentativasBD || []).find(t => t.avaliacao_id === avaliacao.id) || null
            : null;

          return {
            ...materia,
            avaliacao,
            ultimaTentativa,
            totalAulas,
            aulasFeitas,
            porcentagem,
            concluida: totalAulas > 0 && aulasFeitas >= totalAulas
          };
        })
      );

      setMaterias(materiasComAulas);
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading || loadingPlano) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#8B5CF6]" size={32} />
      </div>
    );
  }

  if (erro || !curso) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-8 text-center">
        <BookOpen size={36} className="text-white/20 mb-4" />
        <h2 className="font-black text-lg">Curso não encontrado</h2>
        <Link to="/cursos" className="mt-5 px-5 py-3 bg-[#6D28D9] rounded-2xl text-xs font-black uppercase">
          Voltar para Academia
        </Link>
      </div>
    );
  }

  const temAcesso = temAcessoCurso(curso) || temMatricula;

  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 text-red-400 rounded-[28px] flex items-center justify-center mb-6">
          <Lock size={36} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Acesso restrito</h2>
        <p className="text-white/40 text-sm mt-2 max-w-sm">
          Este curso não está disponível para o seu plano atual.
        </p>
        <a
          href={curso.checkout_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase"
        >
          Garantir meu acesso
        </a>
      </div>
    );
  }

  const totalAulas = materias.reduce((sum, materia) => sum + materia.totalAulas, 0);
  const aulasFeitas = materias.reduce((sum, materia) => sum + materia.aulasFeitas, 0);
  const porcentagem = totalAulas > 0 ? Math.round((aulasFeitas / totalAulas) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-12">
      <header className="sticky top-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 h-16 flex items-center gap-3">
          <Link
            to="/cursos"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">
              Academia Verbo
            </p>
            <h1 className="text-sm font-black truncate">{curso.titulo}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 md:px-8 pt-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#17131F] via-[#110E17] to-[#0A0A0F] p-6 md:p-10 mb-8">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#6D28D9]/15 via-transparent to-transparent" />

          <div className="relative flex flex-col md:flex-row gap-8 md:items-end">
            <div className="w-28 h-40 md:w-36 md:h-52 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#271c6b] to-[#4c36b6] border border-white/10 p-2">
              {curso.thumb_url || curso.capa_url ? (
                <img
                  src={curso.thumb_url || curso.capa_url}
                  alt={curso.titulo}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-black text-white/40">
                    {curso.titulo?.charAt(0) || 'V'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A78BFA] mb-2">
                Curso
              </p>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                {curso.titulo}
              </h2>
              {curso.descricao && (
                <p className="mt-4 text-sm md:text-base leading-6 text-white/55 max-w-3xl">
                  {curso.descricao}
                </p>
              )}

              <div className="mt-6 max-w-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Seu progresso
                  </span>
                  <span className="text-xs font-black text-white/70">{porcentagem}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6D28D9] to-[#A78BFA] rounded-full transition-all"
                    style={{ width: `${porcentagem}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-white/30 font-bold">
                  {aulasFeitas} de {totalAulas} aulas concluídas
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
              Conteúdo
            </p>
            <h2 className="text-xl md:text-2xl font-black mt-1">Matérias</h2>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
            {materias.length} matéria{materias.length !== 1 ? 's' : ''}
          </span>
        </div>

        {materias.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 p-12 text-center">
            <BookOpen size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 text-sm font-bold">Este curso ainda não possui matérias.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {materias.map((materia, index) => (
              <button
                key={materia.id}
                onClick={() => navigate(`/cursos/${curso.id}/materia/${materia.id}`)}
                className="group text-left rounded-[28px] border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all overflow-hidden active:scale-[0.99]"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#6D28D9]/20 text-[#A78BFA] flex items-center justify-center shrink-0">
                      <BookOpen size={20} />
                    </div>
                    {materia.concluida && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase">
                        <CheckCircle size={11} /> Concluída
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                    Matéria {index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-white group-hover:text-[#C4B5FD] transition-colors">
                    {materia.titulo}
                  </h3>

                  {materia.descricao && (
                    <p className="mt-2 text-xs leading-5 text-white/40 line-clamp-2">
                      {materia.descricao}
                    </p>
                  )}

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/35">
                        {materia.totalAulas} aula{materia.totalAulas !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] font-black text-white/45">
                        {materia.porcentagem}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${materia.concluida ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6]'}`}
                        style={{ width: `${materia.porcentagem}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                    {materia.aulasFeitas > 0 ? 'Continuar matéria' : 'Começar matéria'}
                  </span>
                  <PlayCircle size={18} className="text-white/30 group-hover:text-[#A78BFA] transition-colors" />
                </div>
              </button>

              {materia.concluida && materia.avaliacao && (
                <button
                  onClick={() => navigate(`/cursos/${curso.id}/materia/${materia.id}/avaliacao/${materia.avaliacao.id}`)}
                  className="-mt-2 mx-2 px-4 py-3 rounded-b-[20px] border border-t-0 border-purple-500/20 bg-[#6D28D9]/10 text-left hover:bg-[#6D28D9]/20 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]">Avaliação final</p>
                      <p className="text-xs font-black text-white mt-1">
                        {materia.ultimaTentativa?.aprovado ? `Aprovado · ${materia.ultimaTentativa.nota}%` : 'Validar conhecimento'}
                      </p>
                    </div>
                    <CheckCircle size={16} className={materia.ultimaTentativa?.aprovado ? 'text-emerald-400' : 'text-[#A78BFA]'} />
                  </div>
                </button>
              )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Curso;
