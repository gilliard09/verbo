import React, { useState, useEffect } from 'react';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import {
  PlayCircle, Lock, ChevronRight, Loader2,
  ShoppingCart, CheckCircle, BookOpen,
  AlertTriangle, RefreshCw, Sparkles, X, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CursosNew = () => {
  const { isAssinante, isPlus, isFundador, temAcessoCurso, loading: loadingPlano } = usePlano();
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [ultimoVideo, setUltimoVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [playerAberto, setPlayerAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(new Set());
  const [statsProgresso, setStatsProgresso] = useState({
    cursosIniciados: 0,
    certificados: 0,
    diasConsecutivos: 7,
    horasEstudadas: 12
  });

  // ─── Conquistas simuladas (pode ser expandido para banco de dados) ───
  const conquistas = [
    { id: 1, nome: 'Primeiro Passo', descricao: 'Iniciou seu primeiro curso', icon: '🎯', desbloqueada: true },
    { id: 2, nome: 'Sequência Sagrada', descricao: '7 dias consecutivos', icon: '🔥', desbloqueada: true },
    { id: 3, nome: 'Mestre em Formação', descricao: '50 aulas assistidas', icon: '📚', desbloqueada: false },
    { id: 4, nome: 'Certificado Premium', descricao: 'Primeiro certificado obtido', icon: '🏅', desbloqueada: false }
  ];

  // ─── Novidades da Academia ───
  const novidades = [
    { id: 1, tipo: '📖', titulo: 'Novo Devocional', descricao: 'Reflexão diária sobre Fé', data: 'Hoje' },
    { id: 2, tipo: '🎥', titulo: 'Novo Vídeo', descricao: 'Pregação sobre Oração', data: 'Ontem' },
    { id: 3, tipo: '🎓', titulo: 'Novo Curso', descricao: 'Teologia Prática', data: '2 dias atrás' },
    { id: 4, tipo: '🔥', titulo: 'Série Especial', descricao: 'Livro de Romanos', data: '3 dias atrás' }
  ];

  const carregarDados = async () => {
    setLoading(true);
    setErro(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      const idsComMatricula = new Set(minhasMatriculas?.map(m => m.curso_id));

      const aulasPorCurso = (contagemAulas || []).reduce((acc, a) => {
        acc[a.curso_id] = (acc[a.curso_id] || 0) + 1;
        return acc;
      }, {});

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
          temMatricula: idsComMatricula.has(c.id),
          totalAulas,
          aulasFeitas,
          porcentagem,
          concluido: totalAulas > 0 && aulasFeitas >= totalAulas
        };
      });

      cursosFormatados.sort((a, b) => {
        const aAcesso = temAcessoCurso(a) || a.temMatricula;
        const bAcesso = temAcessoCurso(b) || b.temMatricula;
        if (aAcesso && !bAcesso) return -1;
        if (!aAcesso && bAcesso) return 1;
        return 0;
      });

      setCursos(cursosFormatados);

      // Calcular stats
      const cursosAcessiveis = cursosFormatados.filter(c => temAcessoCurso(c) || c.temMatricula);
      const cursosIniciados = cursosAcessiveis.filter(c => c.aulasFeitas > 0).length;
      const certificados = cursosAcessiveis.filter(c => c.concluido).length;

      setStatsProgresso({
        cursosIniciados,
        certificados,
        diasConsecutivos: 7,
        horasEstudadas: cursosIniciados * 2
      });
    } catch (error) {
      console.error("Erro ao carregar academia:", error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    buscarUltimoVideo();
  }, []);

  const isShort = (titulo = '') => {
    const t = titulo.toLowerCase();
    return t.includes('#shorts') || t.includes('#short');
  };

  const buscarUltimoVideo = async () => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    const channelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID;
    setLoadingVideo(true);

    if (apiKey && channelId) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=10&type=video`
        );
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const item = data?.items?.find(i => !isShort(i.snippet?.title));
        if (item) {
          setUltimoVideo({
            id: item.id.videoId,
            titulo: item.snippet.title,
            thumb: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
            publicado: new Date(item.snippet.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          });
          setLoadingVideo(false);
          return;
        }
      } catch (e) {
        console.warn('YouTube API falhou, tentando RSS:', e.message);
      }
    }

    if (channelId) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        const item = data?.items?.find(i => !isShort(i.title));
        if (item) {
          const videoId = item.link?.split('v=')[1] || item.guid?.split('v=')[1];
          setUltimoVideo({
            id: videoId,
            titulo: item.title,
            thumb: item.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            publicado: new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          });
        }
      } catch (e) {
        console.error('RSS também falhou:', e);
      }
    }

    setLoadingVideo(false);
  };

  const toggleDescricao = (id) => {
    setDescricaoExpandida(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  // ─── Componente: Hero — Vídeo Destaque estilo capa Netflix ────────────────
  const HeroVideoDestaque = () => {
    if (loadingVideo) {
      return (
        <div className="mx-6 aspect-[3/4] max-h-[440px] bg-white/5 rounded-[28px] flex items-center justify-center border border-white/10">
          <Loader2 className="animate-spin text-white/30" size={28} />
        </div>
      );
    }
    if (!ultimoVideo) return null;

    return (
      <div className="relative mx-6 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
        {!playerAberto ? (
          <button onClick={() => setPlayerAberto(true)} className="w-full block relative aspect-[3/4] max-h-[440px] group">
            <img
              src={ultimoVideo.thumb}
              alt={ultimoVideo.titulo}
              className="w-full h-full object-cover group-active:scale-105 transition-transform duration-500"
            />
            {/* Gradiente estilo capa de streaming */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500/90 backdrop-blur px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-black uppercase text-white tracking-wide">Novo no canal</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/15 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
                <PlayCircle size={32} className="text-white fill-white/20" strokeWidth={1.5} />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C4B5FD] mb-1.5">
                youtube.com/@ojefersonrocha
              </p>
              <h3 className="font-black text-white text-lg leading-tight line-clamp-2">{ultimoVideo.titulo}</h3>
              <p className="text-[10px] text-white/50 font-bold uppercase mt-1.5">{ultimoVideo.publicado}</p>
            </div>
          </button>
        ) : (
          <div className="relative aspect-video bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${ultimoVideo.id}?autoplay=1`}
              title={ultimoVideo.titulo}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setPlayerAberto(false)}
              className="absolute top-3 right-3 p-2 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Componente: Continue de Onde Parou — card largo tipo "continue watching" ──
  const ContinueDeOndeParou = () => {
    const cursoEmProgresso = cursos.find(
      c => (temAcessoCurso(c) || c.temMatricula) && c.aulasFeitas > 0 && !c.concluido
    );

    if (!cursoEmProgresso) return null;

    const proximaAula = cursoEmProgresso.aulasFeitas + 1;

    return (
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-6">Continue de onde parou</p>
        <div className="px-6">
          <Link
            to={`/cursos/${cursoEmProgresso.id}`}
            className="block relative rounded-[24px] overflow-hidden border border-white/10 active:scale-[0.98] transition-transform"
          >
            <div className="flex bg-gradient-to-br from-[#1A1625] to-[#0F0D16]">
              <div className="w-28 h-28 flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#6D28D9] to-[#3B1E82] flex items-center justify-center p-2.5">
                {cursoEmProgresso.thumb_url || cursoEmProgresso.capa_url ? (
                  <img
                    src={cursoEmProgresso.thumb_url || cursoEmProgresso.capa_url}
                    alt={cursoEmProgresso.titulo}
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                ) : (
                  <span className="text-white font-black text-2xl opacity-60">
                    {cursoEmProgresso.titulo?.charAt(0) || 'V'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <PlayCircle size={26} className="text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-white text-sm leading-tight line-clamp-1">
                    {cursoEmProgresso.titulo}
                  </h3>
                  <p className="text-[#C4B5FD] text-[11px] font-bold mt-0.5">
                    Aula {proximaAula} de {cursoEmProgresso.totalAulas}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD] rounded-full"
                      style={{ width: `${cursoEmProgresso.porcentagem}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 font-bold">{cursoEmProgresso.porcentagem}% concluído</p>
                </div>
              </div>

              <div className="flex items-center pr-4">
                <ChevronRight size={18} className="text-white/30" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  };

  // ─── Componente: Fileira de Cursos — scroll horizontal, cards pôster ──────
  const FileiraCursos = () => {
    const cursosAcessiveis = cursos.filter(c => temAcessoCurso(c) || c.temMatricula);

    if (cursosAcessiveis.length === 0) {
      return (
        <div className="mx-6 text-center py-12 border border-dashed border-white/10 rounded-2xl">
          <BookOpen className="text-white/20 mx-auto mb-2" size={28} />
          <p className="text-white/30 text-sm font-bold">Nenhum curso disponível.</p>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-6">Seus cursos</p>
        <div className="flex gap-3.5 overflow-x-auto px-6 pb-2 -mx-0 scrollbar-hide snap-x snap-mandatory">
          {cursosAcessiveis.map(curso => (
            <Link
              key={curso.id}
              to={`/cursos/${curso.id}`}
              className="snap-start shrink-0 w-[132px] active:scale-95 transition-transform group"
            >
              <div className="relative w-[132px] aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#271c6b] to-[#4c36b6] border border-white/10 p-2">
                {curso.thumb_url || curso.capa_url ? (
                  <img
                    src={curso.thumb_url || curso.capa_url}
                    alt={curso.titulo}
                    className="w-full h-full object-contain drop-shadow-lg"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white font-black text-3xl opacity-50">
                      {curso.titulo?.charAt(0) || 'V'}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {curso.concluido && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black">
                    <CheckCircle size={9} /> Concluído
                  </div>
                )}

                {!curso.concluido && curso.porcentagem > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#C4B5FD]"
                      style={{ width: `${curso.porcentagem}%` }}
                    />
                  </div>
                )}
              </div>
              <h3 className="font-bold text-white text-[12.5px] leading-tight line-clamp-2 mt-2">
                {curso.titulo}
              </h3>
              {curso.totalAulas > 0 && (
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wide mt-0.5">
                  {curso.totalAulas} aula{curso.totalAulas !== 1 ? 's' : ''}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // ─── Componente: Conquistas — fileira horizontal de badges ────────────────
  const SecaoConquistas = () => (
    <div className="mb-8">
      <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 px-6">Suas conquistas</p>
      <div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
        {conquistas.map(c => (
          <div
            key={c.id}
            className={`snap-start shrink-0 w-[132px] rounded-2xl p-3.5 border transition-all ${
              c.desbloqueada
                ? 'bg-white/5 border-white/10'
                : 'bg-white/[0.02] border-white/5 opacity-40'
            }`}
          >
            <p className="text-xl mb-1.5">{c.icon}</p>
            <h4 className="font-black text-white text-[11px] leading-tight">{c.nome}</h4>
            <p className="text-[9.5px] text-white/40 mt-1 leading-snug">{c.descricao}</p>
            {c.desbloqueada && (
              <div className="mt-2 text-[9px] font-black text-emerald-400">✓ Desbloqueada</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading || loadingPlano) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#8B5CF6]" size={32} />
      </div>
    );
  }

  // ─── Erro ────────────────────────────────────────────────────────────────
  if (erro) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="text-red-400" size={24} />
        </div>
        <div>
          <p className="font-black text-white uppercase text-sm">Erro ao carregar</p>
          <p className="text-white/40 text-xs mt-1">Verifique sua conexão e tente novamente.</p>
        </div>
        <button
          onClick={carregarDados}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#6D28D9] text-white rounded-full font-black text-xs uppercase shadow-lg hover:bg-[#5b23c8] transition-colors"
        >
          <RefreshCw size={13} /> Tentar novamente
        </button>
      </div>
    );
  }

  // ─── Acesso restrito ─────────────────────────────────────────────────────
  if (!isAssinante) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] pb-24 pt-2">
        <div className="p-6 pb-0 max-w-2xl mx-auto">
          <header className="mb-6 mt-2 flex items-center gap-3">
            <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-white/10 active:bg-white/10 transition-colors shrink-0">
              <ArrowLeft size={20} className="text-white" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase text-white mb-1">
                Academia Verbo
              </h1>
              <p className="text-white/40 text-sm">Formando cristãos para viver e ensinar a Palavra.</p>
            </div>
          </header>
        </div>

        <div className="mb-8">
          <HeroVideoDestaque />
        </div>

        <div className="px-6 max-w-2xl mx-auto flex flex-col items-center gap-5 text-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#A78BFA] mb-2 block">
              Quer crescer ainda mais?
            </span>
            <h2 className="font-black text-xl text-white tracking-tight mb-2">
              Acesse cursos completos<br />da Academia Verbo
            </h2>
            <p className="text-white/40 text-sm">
              Teologia, pregação e formação ministerial — tudo em aulas progressivas.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-5 w-full space-y-3">
            {[
              'Cursos de teologia do zero ao avançado',
              'Pregação na prática',
              'Novos cursos todo mês',
              'Certificados oficiais'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={10} className="text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-white/70">{item}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/upgrade?motivo=academia')}
            className="w-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-purple-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Ver Planos
          </button>

          <p className="text-[10px] text-white/30 font-bold uppercase">A partir de R$9,90/mês</p>
        </div>
      </div>
    );
  }

  // ─── Academia liberada ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28 pt-2">
      {/* Cabeçalho */}
      <header className="mb-6 mt-2 px-6 flex items-center gap-3">
        <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-white/10 active:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase text-white mb-1">
            Academia Verbo
          </h1>
          <p className="text-white/40 text-sm">Formando cristãos para viver e ensinar a Palavra.</p>
        </div>
      </header>

      {/* Vídeo Destaque — hero estilo capa */}
      <div className="mb-8">
        <HeroVideoDestaque />
      </div>

      {/* Continue de Onde Parou */}
      <ContinueDeOndeParou />

      {/* Fileira de Cursos */}
      <FileiraCursos />

      {/* Conquistas */}
      <SecaoConquistas />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default CursosNew;