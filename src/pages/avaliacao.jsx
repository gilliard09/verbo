import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CircleAlert, Loader2, Send, Trophy } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Avaliacao = () => {
  const { cursoId, materiaId, avaliacaoId } = useParams();
  const navigate = useNavigate();

  const [avaliacao, setAvaliacao] = useState(null);
  const [materia, setMateria] = useState(null);
  const [curso, setCurso] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [tentativaAnterior, setTentativaAnterior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, [avaliacaoId, materiaId, cursoId]);

  const carregar = async () => {
    setLoading(true);
    setErro('');

    try {
      const [{ data: cursoBD, error: cursoError }, { data: materiaBD, error: materiaError }, { data: avaliacaoData, error: avaliacaoError }] = await Promise.all([
        supabase.from('cursos').select('id,titulo').eq('id', cursoId).single(),
        supabase.from('materias').select('id,titulo,curso_id').eq('id', materiaId).single(),
        supabase.rpc('obter_avaliacao', { p_avaliacao_id: avaliacaoId })
      ]);

      if (cursoError) throw cursoError;
      if (materiaError) throw materiaError;
      if (avaliacaoError) throw avaliacaoError;

      setCurso(cursoBD);
      setMateria(materiaBD);
      setAvaliacao(avaliacaoData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ultima } = await supabase
          .from('tentativas_avaliacao')
          .select('id,nota,acertos,total_questoes,aprovado,concluida_em')
          .eq('avaliacao_id', avaliacaoId)
          .eq('user_id', user.id)
          .order('concluida_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        setTentativaAnterior(ultima || null);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error);
      setErro(error.message || 'Não foi possível carregar a avaliação.');
    } finally {
      setLoading(false);
    }
  };

  const questoes = avaliacao?.questoes || [];
  const respondidas = Object.keys(respostas).length;
  const progresso = questoes.length ? Math.round((respondidas / questoes.length) * 100) : 0;

  const selecionar = (questaoId, alternativa) => {
    if (resultado) return;
    setRespostas(prev => ({ ...prev, [questaoId]: alternativa }));
  };

  const enviar = async () => {
    if (respondidas < questoes.length) {
      setErro('Responda todas as questões antes de enviar a avaliação.');
      return;
    }

    setEnviando(true);
    setErro('');

    const { data, error } = await supabase.rpc('enviar_tentativa_avaliacao', {
      p_avaliacao_id: avaliacaoId,
      p_respostas: respostas
    });

    if (error) {
      console.error(error);
      setErro(error.message || 'Não foi possível registrar sua avaliação.');
      setEnviando(false);
      return;
    }

    setResultado(data);
    setTentativaAnterior(data);
    setEnviando(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const voltar = () => navigate(`/cursos/${cursoId}`);

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center"><Loader2 className="animate-spin text-[#8B5CF6]" size={36}/></div>;
  }

  if (erro && !avaliacao) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center p-8 text-center">
        <CircleAlert size={36} className="text-red-400 mb-4"/>
        <p className="text-sm text-white/60 max-w-md">{erro}</p>
        <button onClick={voltar} className="mt-6 px-5 py-3 rounded-2xl bg-[#6D28D9] text-xs font-black uppercase">Voltar para a matéria</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-16">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center gap-3">
          <button onClick={voltar} className="p-2 rounded-xl hover:bg-white/10"><ArrowLeft size={20}/></button>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA] truncate">{curso?.titulo}</p>
            <h1 className="text-sm font-black truncate">{materia?.titulo}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 md:px-8 pt-8">
        {!resultado ? (
          <>
            <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#17131F] to-[#0D0B12] p-6 md:p-8 mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A78BFA]">Avaliação da matéria</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">{avaliacao?.titulo}</h2>
              <p className="mt-3 text-sm leading-6 text-white/50">{avaliacao?.descricao || 'Responda às questões para validar seu aprendizado nesta matéria.'}</p>
              <div className="mt-6 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest">
                <span className="px-3 py-2 rounded-xl bg-white/5 text-white/50">{questoes.length} questões</span>
                <span className="px-3 py-2 rounded-xl bg-purple-500/10 text-[#C4B5FD]">Nota mínima {avaliacao?.nota_minima}%</span>
                {tentativaAnterior && <span className={`px-3 py-2 rounded-xl ${tentativaAnterior.aprovado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>Última nota {tentativaAnterior.nota}%</span>}
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30 mb-2"><span>Progresso</span><span>{respondidas}/{questoes.length}</span></div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#6D28D9] to-[#A78BFA] transition-all" style={{width:`${progresso}%`}}/></div>
              </div>
            </section>

            <div className="space-y-4">
              {questoes.map((questao, index) => (
                <section key={questao.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-7">
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#6D28D9]/20 text-[#A78BFA] flex items-center justify-center text-xs font-black shrink-0">{index + 1}</div>
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-bold leading-6">{questao.enunciado}</h3>
                      <div className="mt-5 grid gap-3">
                        {(questao.alternativas || []).map(opcao => {
                          const marcada = respostas[questao.id] === opcao.valor;
                          return (
                            <button key={opcao.valor} onClick={() => selecionar(questao.id, opcao.valor)} className={`w-full text-left p-4 rounded-2xl border transition-all ${marcada ? 'border-[#8B5CF6] bg-[#6D28D9]/15 text-white' : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/5'}`}>
                              <span className={`inline-flex w-8 h-8 rounded-xl items-center justify-center mr-3 text-[10px] font-black ${marcada ? 'bg-[#8B5CF6] text-white' : 'bg-white/5 text-white/35'}`}>{opcao.valor}</span>
                              <span className="text-sm font-semibold">{opcao.texto}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {erro && <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold">{erro}</div>}

            <button onClick={enviar} disabled={enviando || questoes.length === 0} className="mt-6 w-full py-5 rounded-2xl bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50">
              {enviando ? <Loader2 className="animate-spin" size={16}/> : <><Send size={16}/>Enviar avaliação</>}
            </button>
          </>
        ) : (
          <section className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#17131F] to-[#0D0B12] p-8 md:p-12 text-center">
            {resultado.aprovado ? <Trophy size={52} className="mx-auto text-yellow-400 mb-5"/> : <CircleAlert size={52} className="mx-auto text-orange-400 mb-5"/>}
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A78BFA]">Resultado</p>
            <h2 className="mt-2 text-4xl md:text-6xl font-black">{resultado.nota}%</h2>
            <p className="mt-2 text-sm text-white/45">{resultado.acertos} de {resultado.total_questoes} questões corretas</p>
            <div className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase ${resultado.aprovado ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {resultado.aprovado ? <><CheckCircle size={14}/> Aprovado</> : 'Não aprovado'}
            </div>
            <p className="mt-5 text-sm text-white/50 max-w-lg mx-auto">
              {resultado.aprovado ? 'Você validou seu conhecimento nesta matéria. A formação continua.' : `Você precisa de pelo menos ${resultado.nota_minima}% para aprovação. Revise o conteúdo e tente novamente.`}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              {!resultado.aprovado && <button onClick={() => { setResultado(null); setRespostas({}); setErro(''); }} className="px-6 py-3 rounded-2xl bg-white text-black text-xs font-black uppercase">Tentar novamente</button>}
              <button onClick={voltar} className="px-6 py-3 rounded-2xl bg-[#6D28D9] text-white text-xs font-black uppercase">Voltar para a matéria</button>
            </div>
          </section>

          {Array.isArray(resultado.revisao) && resultado.revisao.length > 0 && (
            <section className="mt-6">
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A78BFA]">Revisão</p>
                <h2 className="mt-1 text-2xl font-black">Entenda suas respostas</h2>
                <p className="mt-2 text-sm text-white/45">Veja o que você marcou, a resposta correta e a explicação de cada questão.</p>
              </div>

              <div className="space-y-4">
                {resultado.revisao.map((questao, index) => {
                  const marcada = (questao.alternativas || []).find(opcao => opcao.valor === questao.resposta_marcada);
                  const correta = (questao.alternativas || []).find(opcao => opcao.valor === questao.resposta_correta);

                  return (
                    <article key={questao.questao_id} className={`rounded-[28px] border p-5 md:p-7 ${questao.correta ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-orange-500/20 bg-orange-500/[0.04]'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${questao.correta ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
                          {questao.correta ? <CheckCircle size={18}/> : <CircleAlert size={18}/>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Questão {index + 1}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${questao.correta ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {questao.correta ? 'Correta' : 'Incorreta'}
                            </span>
                          </div>
                          <h3 className="mt-2 text-base md:text-lg font-bold leading-6">{questao.enunciado}</h3>

                          {marcada && (
                            <div className="mt-5 rounded-2xl bg-black/20 border border-white/5 p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Sua resposta</p>
                              <p className="mt-1 text-sm font-semibold text-white/75"><span className="text-[#A78BFA]">{marcada.valor}</span> — {marcada.texto}</p>
                            </div>
                          )}

                          {!questao.correta && correta && (
                            <div className="mt-3 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/10 p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70">Resposta correta</p>
                              <p className="mt-1 text-sm font-semibold text-emerald-300"><span className="text-emerald-400">{correta.valor}</span> — {correta.texto}</p>
                            </div>
                          )}

                          {questao.explicacao && (
                            <div className="mt-3 rounded-2xl bg-[#6D28D9]/10 border border-[#6D28D9]/20 p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]">Por que essa é a resposta?</p>
                              <p className="mt-2 text-sm leading-6 text-white/65">{questao.explicacao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        )}
      </main>
    </div>
  );
};

export default Avaliacao;
