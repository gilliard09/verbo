import React, { useState, useEffect, useRef } from 'react';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import {
  PlayCircle, ChevronRight, Loader2, CheckCircle, BookOpen,
  AlertTriangle, RefreshCw, Sparkles, X, ArrowLeft,
  Home, Library, Compass, ChevronLeft, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DesktopAcademiaSidebar = () => {
  const [activeAnchor, setActiveAnchor] = useState(window.location.hash || '#inicio-academia');
  const itemClass = (active) => `group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] ${active ? 'border border-[#8B5CF6]/25 bg-[#6D28D9]/20 text-white shadow-inner shadow-purple-950/20' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'}`;
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[264px] flex-col border-r border-white/[0.07] bg-[#0D0A13] px-5 py-7">
      <div className="mb-8 flex flex-col items-start px-2">
        <img src="/logo.webp" alt="Verbo" className="h-10 w-auto max-w-[168px] object-contain object-left" />
        <span className="mt-2 rounded-md border border-[#8B5CF6]/30 bg-[#6D28D9]/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#C4B5FD]">Academia</span>
      </div>
      <Link to="/" className="mb-8 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3 text-xs font-bold text-white/80 transition-all hover:border-[#A78BFA]/50 hover:bg-[#6D28D9]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]">
        <ArrowLeft size={15} /> Voltar ao Verbo
      </Link>
      <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Sua Academia</p>
      <nav className="space-y-1.5" aria-label="Navegação da Academia">
        <a href="#inicio-academia" onClick={() => setActiveAnchor("#inicio-academia")} className={itemClass(activeAnchor === '' || activeAnchor === '#inicio-academia')}><Home size={17} className="text-[#C4B5FD]" /> Início da Academia</a>
        <a href="#continue-assistindo" onClick={() => setActiveAnchor("#continue-assistindo")} className={itemClass(activeAnchor === '#continue-assistindo')}><PlayCircle size={17} /> Continuar assistindo</a>
        <a href="#seus-cursos" onClick={() => setActiveAnchor("#seus-cursos")} className={itemClass(activeAnchor === '#seus-cursos')}><Library size={17} /> Meus cursos</a>
        <a href="#catalogo" onClick={() => setActiveAnchor("#catalogo")} className={itemClass(activeAnchor === '#catalogo')}><Compass size={17} /> Explorar cursos</a>
      </nav>
      <div className="mt-auto rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#211638] to-[#120D1D] p-4">
        <p className="text-xs font-bold text-white">Cresça no conhecimento.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">Formando cristãos para viver e ensinar a Palavra.</p>
      </div>
    </aside>
  );
};

const CourseRow = ({ title, items, id }) => {
  const rowRef = useRef(null);
  const scroll = direction => rowRef.current?.scrollBy({ left: direction * 520, behavior: 'smooth' });
  return (
    <section id={id} className="group/course-row relative min-w-0">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-white">{title}</h2><div className="flex gap-2 opacity-0 transition-opacity group-hover/course-row:opacity-100 group-focus-within/course-row:opacity-100"><button type="button" onClick={() => scroll(-1)} aria-label={`Rolar ${title} para a esquerda`} className="rounded-full border border-white/15 bg-black/70 p-2 text-white hover:bg-[#4C1D95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"><ChevronLeft size={17}/></button><button type="button" onClick={() => scroll(1)} aria-label={`Rolar ${title} para a direita`} className="rounded-full border border-white/15 bg-black/70 p-2 text-white hover:bg-[#4C1D95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"><ChevronRight size={17}/></button></div></div>
      <div ref={rowRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-visible px-2 py-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items?.length ? items : <p className="py-5 text-sm text-white/40">Ainda não há itens nesta fileira. Explore o catálogo para começar.</p>}</div>
    </section>
  );
};

const CursosNew = () => {
  const { isAssinante, temAcessoCurso, loading: loadingPlano } = usePlano();
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [ultimoVideo, setUltimoVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [playerAberto, setPlayerAberto] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [statsProgresso, setStatsProgresso] = useState({
    cursosIniciados: 0,
    certificados: 0,
    aulasConcluidas: 0,
    diasConsecutivos: 7,
    horasEstudadas: 12
  });

  const cursosComAcesso = cursos.filter(c => temAcessoCurso(c) || c.temMatricula);
  const cursoEmProgresso = cursosComAcesso.find(c => c.aulasFeitas > 0 && !c.concluido);
  const cursosNovos = [...cursos].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const continuarItens = cursosComAcesso.filter(c => c.aulasFeitas > 0 && !c.concluido);
  const heroSlides = [cursoEmProgresso || cursosComAcesso[0] || cursos[0], ...cursos.filter(c => c.id !== (cursoEmProgresso || cursosComAcesso[0] || cursos[0])?.id).slice(0, 2)].filter(Boolean);
  const cursoDestaque = heroSlides[heroIndex % Math.max(heroSlides.length, 1)];

  // ─── Conquistas ──────────────────────────────────────────────────────────
  const conquistas = [
    { id: 1, nome: 'Primeiro Passo', descricao: 'Iniciou seu primeiro curso', icon: '🎯', desbloqueada: statsProgresso.cursosIniciados > 0 },
    { id: 2, nome: 'Sequência Sagrada', descricao: '7 dias consecutivos', icon: '🔥', desbloqueada: statsProgresso.diasConsecutivos >= 7 },
    { id: 3, nome: 'Mestre em Formação', descricao: '50 aulas assistidas', icon: '📚', desbloqueada: statsProgresso.aulasConcluidas >= 50 },
    { id: 4, nome: 'Certificado Premium', descricao: 'Primeiro certificado obtido', icon: '🏅', desbloqueada: statsProgresso.certificados > 0 }
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
        { data: aulasDetalhadas }
      ] = await Promise.all([
        supabase.from('cursos').select('*').order('created_at', { ascending: true }),
        supabase.from('matriculas').select('curso_id').eq('user_id', user?.id),
        supabase.from('progresso_aulas')
          .select('aula_id, aulas!inner(curso_id)')
          .eq('user_id', user?.id),
        supabase.from('aulas').select('*').order('ordem', { ascending: true })
      ]);

      if (errCursos) throw errCursos;

      const idsComMatricula = new Set(minhasMatriculas?.map(m => m.curso_id));

      const aulasPorCurso = (aulasDetalhadas || []).reduce((acc, a) => {
        acc[a.curso_id] = (acc[a.curso_id] || 0) + 1;
        return acc;
      }, {});

      const progressoPorCurso = (progresso || []).reduce((acc, p) => {
        const cursoId = p.aulas?.curso_id;
        if (cursoId) acc[cursoId] = (acc[cursoId] || 0) + 1;
        return acc;
      }, {});

      const idsAulasConcluidas = new Set((progresso || []).map(p => p.aula_id));
      const cursosFormatados = (todosCursos || []).map(c => {
        const aulasDoCurso = (aulasDetalhadas || []).filter(a => a.curso_id === c.id);
        const totalAulas = aulasPorCurso[c.id] || 0;
        const aulasFeitas = progressoPorCurso[c.id] || 0;
        const proximaAula = aulasDoCurso.find(a => !idsAulasConcluidas.has(a.id)) || aulasDoCurso[0] || null;
        const porcentagem = totalAulas > 0 ? Math.round((aulasFeitas / totalAulas) * 100) : 0;
        return {
          ...c,
          temMatricula: idsComMatricula.has(c.id),
          totalAulas,
          aulasFeitas,
          proximaAula,
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
        aulasConcluidas: (progresso || []).length,
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
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange = event => setReducedMotion(event.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused || reducedMotion) return undefined;
    const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroSlides.length), 7500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, heroPaused, reducedMotion]);

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

  // ─── Componente: Hero — Vídeo Destaque estilo capa Netflix ────────────────
  const HeroVideoDestaque = () => {
    if (loadingVideo) {
      return (
        <div className="mx-6 md:mx-0 aspect-[3/4] md:aspect-[21/8] max-h-[440px] md:max-h-[480px] bg-white/5 rounded-[28px] flex items-center justify-center border border-white/10">
          <Loader2 className="animate-spin text-white/30" size={28} />
        </div>
      );
    }
    if (!ultimoVideo) return null;

    return (
      <div className="relative mx-6 md:mx-0 rounded-[28px] overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
        {!playerAberto ? (
          <button onClick={() => setPlayerAberto(true)} className="w-full block relative aspect-[3/4] md:aspect-[21/8] max-h-[440px] md:max-h-[480px] group">
            <img
              src={ultimoVideo.thumb}
              alt={ultimoVideo.titulo}
              className="w-full h-full object-cover md:object-[center_38%] group-active:scale-105 transition-transform duration-500"
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
      <div className="mb-10 md:mb-12">
        <p className="text-xs md:text-sm font-black uppercase tracking-widest text-white/40 mb-3 px-6 md:px-0">Continue de onde parou</p>
        <div className="px-6 md:px-0">
          <Link
            to={`/cursos/${cursoEmProgresso.id}`}
            className="block relative rounded-[24px] overflow-hidden border border-white/10 active:scale-[0.98] transition-transform"
          >
            <div className="flex bg-gradient-to-br from-[#1A1625] to-[#0F0D16] md:min-h-[150px]">
              <div className="w-28 h-28 md:w-44 md:min-h-[150px] md:h-auto flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#6D28D9] to-[#3B1E82] flex items-center justify-center p-2.5">
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

              <div className="flex-1 min-w-0 p-4 md:p-6 flex flex-col justify-between">
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
        <p className="text-xs md:text-sm font-black uppercase tracking-widest text-white/40 mb-4 px-6 md:px-0">Seus cursos</p>
        <div className="flex gap-4 md:gap-5 overflow-x-auto px-6 md:px-0 pb-3 scrollbar-hide snap-x snap-mandatory">
          {cursosAcessiveis.map(curso => (
            <Link
              key={curso.id}
              to={`/cursos/${curso.id}`}
              className="snap-start shrink-0 w-[132px] md:w-[190px] active:scale-95 transition-transform group"
            >
              <div className="relative w-[132px] md:w-[190px] aspect-[2/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#271c6b] to-[#4c36b6] border border-white/10 p-2">
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
      <p className="text-xs md:text-sm font-black uppercase tracking-widest text-white/40 mb-4 px-6 md:px-0">Suas conquistas</p>
      <div className="flex gap-3 md:gap-4 overflow-x-auto px-6 md:px-0 pb-3 scrollbar-hide snap-x snap-mandatory">
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
      <>
        <div className="hidden md:block min-h-screen bg-[#0A0A0F] pl-[264px] text-white">
          <DesktopAcademiaSidebar />
          <div className="h-[62vh] animate-pulse bg-gradient-to-r from-[#17111F] via-[#24153D] to-[#0A0A0F]" />
          <div className="space-y-8 px-12 py-8">
            <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
            <div className="flex gap-5">{[1,2,3,4,5].map(n => <div key={n} className="w-[190px] shrink-0"><div className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.07]" /><div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-white/10" /></div>)}</div>
          </div>
        </div>
        <div className="md:hidden min-h-screen bg-[#0A0A0F] flex items-center justify-center"><Loader2 className="animate-spin text-[#8B5CF6]" size={32} /></div>
      </>
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
      <div className="min-h-screen bg-[#0A0A0F] pb-24 pt-2 md:pb-10 md:pt-0 md:pl-[264px]">
        <DesktopAcademiaSidebar />
        <div className="p-6 pb-0 max-w-2xl mx-auto md:max-w-[1440px] md:px-10 md:pt-10">
          <header className="mb-6 mt-2 flex items-center gap-3 md:mb-8">
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

        <div className="mb-8 md:mb-10 md:mx-auto md:max-w-[1440px] md:px-10">
          <HeroVideoDestaque />
        </div>

        <div className="px-6 max-w-2xl mx-auto flex flex-col items-center gap-5 text-center md:max-w-3xl md:pt-4">
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

  const posterCard = (curso, badgeNovo = false) => (
    <Link key={curso.id} to={`/cursos/${curso.id}`} className="group relative block w-[190px] shrink-0 snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] rounded-xl">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#271c6b] to-[#4c36b6] shadow-lg transition-all duration-300 delay-200 ease-out group-hover:z-20 group-hover:scale-[1.08] group-hover:shadow-2xl group-hover:shadow-black/60 motion-reduce:transition-none">
        {curso.thumb_url || curso.capa_url ? <img loading="lazy" src={curso.thumb_url || curso.capa_url} alt={curso.titulo} className="h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-70" onLoad={e => e.currentTarget.classList.remove("opacity-0")} /> : <div className="flex h-full items-center justify-center"><span className="text-4xl font-black text-white/50">{curso.titulo?.charAt(0) || 'V'}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent opacity-80" />
        {curso.concluido && <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[8px] font-black text-white">Concluído</span>}
        {!curso.concluido && curso.porcentagem > 0 && <span className="absolute left-2 top-2 rounded-full bg-[#6D28D9] px-2 py-1 text-[8px] font-black text-white">Em andamento</span>}
        {badgeNovo && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-[8px] font-black text-[#4C1D95]">Novo</span>}
        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#4C1D95] shadow-lg"><PlayCircle size={22} fill="currentColor" /></div>
          <p className="line-clamp-2 text-sm font-black text-white">{curso.titulo}</p>
          <p className="mt-1 text-[10px] font-semibold text-white/65">{curso.totalAulas || 0} aulas · {curso.porcentagem || 0}% concluído</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15"><div className={`h-full ${curso.concluido ? 'bg-emerald-400' : 'bg-[#A78BFA]'}`} style={{width:`${curso.porcentagem || 0}%`}} /></div>
      </div>
      <p className="mt-3 line-clamp-2 text-[13px] font-bold text-white">{curso.titulo}</p>
      <p className="mt-1 text-[10px] text-white/40">{curso.totalAulas || 0} aulas</p>
    </Link>
  );
  const continueCard = (curso) => (
    <Link key={curso.id} to={`/cursos/${curso.id}`} className="group w-[300px] shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] rounded-xl">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#17131F]">
        {curso.proximaAula?.thumb_url || curso.proximaAula?.thumbnail_url || curso.thumb_url || curso.capa_url ? <img loading="lazy" src={curso.proximaAula?.thumb_url || curso.proximaAula?.thumbnail_url || curso.thumb_url || curso.capa_url} alt={curso.proximaAula?.titulo || curso.titulo} className="h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105" onLoad={e => e.currentTarget.classList.remove("opacity-0")} /> : <div className="flex h-full items-center justify-center"><BookOpen size={30} className="text-white/25" /></div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/60 bg-black/45 text-white backdrop-blur"><PlayCircle size={26} /></span></div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20"><div className="h-full bg-[#A78BFA]" style={{width:`${curso.porcentagem}%`}} /></div>
      </div>
      <p className="mt-2 truncate text-sm font-bold text-white">{curso.titulo}</p>
      <p className="mt-1 text-[11px] text-[#C4B5FD]">Aula {Math.min(curso.aulasFeitas + 1, curso.totalAulas)} de {curso.totalAulas}</p>
    </Link>
  );

  return (
    <>
      <div className="hidden md:block min-h-screen bg-[#0A0A0F] pl-[264px] text-white">
        <DesktopAcademiaSidebar />
        <main className="min-h-screen overflow-hidden">
          <section id="inicio-academia" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} className="relative flex min-h-[62vh] items-end overflow-hidden bg-[#0A0A0F]">
            {cursoDestaque?.thumb_url || cursoDestaque?.capa_url ? <img src={cursoDestaque.thumb_url || cursoDestaque.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#24153D] via-[#100D19] to-[#0A0A0F]" />}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F] via-[#0A0A0F]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-[#0A0A0F]/15" />
            <div className="relative z-10 max-w-3xl px-12 pb-16 pt-20">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#C4B5FD]">{cursoEmProgresso ? 'Continue sua jornada' : 'Recomendado para você'}</p>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight">{cursoDestaque?.titulo || 'Academia Verbo'}</h1>
              <p className="mt-5 line-clamp-2 max-w-2xl text-base leading-7 text-white/70">{cursoDestaque?.descricao || 'Formação bíblica e ministerial para viver e ensinar a Palavra.'}</p>
              {cursoEmProgresso && <p className="mt-4 text-sm font-bold text-[#C4B5FD]">Aula {Math.min(cursoEmProgresso.aulasFeitas + 1, cursoEmProgresso.totalAulas)} de {cursoEmProgresso.totalAulas} · {cursoEmProgresso.porcentagem}% concluído</p>}
              <div className="mt-7 flex items-center gap-3">
                <button onClick={() => navigate(cursoDestaque ? `/cursos/${cursoDestaque.id}` : '/cursos')} className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-black text-[#17111F] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"><PlayCircle size={18} fill="currentColor" /> {cursoEmProgresso ? 'Continuar' : 'Começar'}</button>
                <button onClick={() => navigate(cursoDestaque ? `/cursos/${cursoDestaque.id}` : '/cursos')} className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"><Info size={17} /> Detalhes</button>
              </div>
              {heroSlides.length > 1 && <div className="mt-6 flex items-center gap-2" aria-label="Destaques da Academia">{heroSlides.map((slide,index) => <button key={slide.id} onClick={() => setHeroIndex(index)} aria-label={`Mostrar destaque ${index+1}`} aria-current={index === heroIndex ? 'true' : undefined} className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-white' : 'w-3 bg-white/35 hover:bg-white/70'}`}/>)}</div>}
            </div>
          </section>

          <div className="space-y-10 px-12 pb-16 pt-5">
            <CourseRow id="continue-assistindo" title="Continue assistindo" items={continuarItens.map(continueCard)} />
            {ultimoVideo && <section><h2 className="mb-4 text-lg font-black">Novidades do canal</h2><button onClick={() => setPlayerAberto(true)} className="group relative w-[360px] overflow-hidden rounded-xl border border-white/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]"><div className="relative aspect-video"><img loading="lazy" src={ultimoVideo.thumb} alt={ultimoVideo.titulo} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /><div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle size={42} className="text-white" /></div><span className="absolute left-3 top-3 rounded-full bg-red-600 px-2 py-1 text-[9px] font-black uppercase">Novo no canal</span></div><p className="p-3 text-sm font-bold text-white">{ultimoVideo.titulo}</p></button></section>}
            <CourseRow title="Novidades" items={cursosNovos.slice(0, 6).map((c, index) => posterCard(c, index === 0))} />
            <CourseRow id="seus-cursos" title="Seus cursos" items={cursosComAcesso.map(c => posterCard(c))} />
            <CourseRow id="catalogo" title="Explorar cursos" items={cursos.map(c => posterCard(c, cursosNovos[0]?.id === c.id))} />
            <section><h2 className="mb-4 text-lg font-black">Suas conquistas</h2><div className="flex gap-3 overflow-x-auto pb-2">{conquistas.map(c => <div key={c.id} className="w-40 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xl">{c.icon}</p><p className="mt-2 text-xs font-bold text-white">{c.nome}</p><p className="mt-1 text-[10px] text-white/40">{c.descricao}</p></div>)}</div></section>
          </div>
        </main>
        <style>{`
          @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
          #continue-assistindo, #seus-cursos, #catalogo { scroll-margin-top: 28px; }
        `}</style>
      </div>
      <div className="md:hidden">
            <div className="min-h-screen bg-[#0A0A0F] pb-28 pt-2 md:pb-12 md:pt-0 md:pl-[264px]">
      <DesktopAcademiaSidebar />
      {/* Cabeçalho */}
      <header className="mb-6 mt-2 px-6 flex items-center gap-3 md:mx-auto md:mb-8 md:max-w-[1440px] md:px-10 md:pt-10">
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
      <div className="mb-10 md:mx-auto md:mb-12 md:max-w-[1440px] md:px-10">
        <HeroVideoDestaque />
      </div>

      {/* Continue de Onde Parou */}
      <div className="md:mx-auto md:max-w-[1440px] md:px-10">
        <ContinueDeOndeParou />

        {/* Fileira de Cursos */}
        <FileiraCursos />

        {/* Conquistas */}
        <SecaoConquistas />
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
      </div>
    </>
  );
};

export default CursosNew;