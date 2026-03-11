import React, { useState, useEffect } from 'react';
import { usePlano } from '../hooks/usePlano';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import {
  PlayCircle, Lock, ChevronRight, Loader2,
  ShoppingCart, CheckCircle, Award, BookOpen,
  ChevronDown, AlertTriangle, RefreshCw, Sparkles, Youtube, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Cursos = () => {
  const { isPlus, loading: loadingPlano } = usePlano(); // ← loading do plano separado
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [ultimoVideo, setUltimoVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [playerAberto, setPlayerAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(new Set());

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
          // ← acesso por matrícula individual (cursos avulsos pagos)
          // o acesso por plano (isPlus) é tratado na UI abaixo
          temMatricula: idsComMatricula.has(c.id),
          totalAulas,
          aulasFeitas,
          porcentagem,
          concluido: totalAulas > 0 && aulasFeitas >= totalAulas
        };
      });

      cursosFormatados.sort((a, b) => {
        if (a.temMatricula && !b.temMatricula) return -1;
        if (!a.temMatricula && b.temMatricula) return 1;
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
          `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=10&type=video&videoDuration=medium`
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

  // ─── Aguarda AMBOS carregarem antes de decidir o que mostrar ─────────────────
  if (loading || loadingPlano) return (
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

  // ─── Academia bloqueada — só aparece depois que plano E cursos carregaram ────
  if (!isPlus) {
    return (
      <div className="min-h-screen pb-28">
        <div className="p-6 pb-0 max-w-2xl mx-auto">
          <header className="mb-6 mt-2">
            <h1 className="text-2xl font-black tracking-tight uppercase text-slate-800">Academia Verbo</h1>
            <p className="text-gray-400 text-sm mt-1">Sua formação ministerial descomplicada.</p>
          </header>
        </div>

        {/* Player do último vídeo */}
        <div className="px-6 max-w-2xl mx-auto mb-6">
          <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
              <div className="w-7 h-7 bg-red-50 rounded-xl flex items-center justify-center">
                <Youtube size={14} className="text-red-500" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Último vídeo do canal</p>
                <p className="text-[9px] text-slate-300 font-bold">youtube.com/@ojefersonrocha</p>
              </div>
            </div>

            {loadingVideo ? (
              <div className="aspect-video flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : ultimoVideo ? (
              <>
                {!playerAberto ? (
                  <button onClick={() => setPlayerAberto(true)} className="w-full relative aspect-video overflow-hidden group">
                    <img src={ultimoVideo.thumb} alt={ultimoVideo.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <PlayCircle size={32} className="text-white fill-white" />
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="relative aspect-video">
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ultimoVideo.id}?autoplay=1`} title={ultimoVideo.titulo} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    <button onClick={() => setPlayerAberto(false)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"><X size={14} /></button>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-black text-slate-800 text-sm leading-snug mb-1">{ultimoVideo.titulo}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{ultimoVideo.publicado}</p>
                </div>
              </>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-slate-50">
                <p className="text-slate-300 text-xs font-bold">Vídeo não disponível no momento</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 max-w-2xl mx-auto flex flex-col items-center gap-5 text-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5B2DFF] mb-2 block">Quer ir mais fundo?</span>
            <h2 className="font-black text-xl text-slate-800 tracking-tight mb-2">Acesse os cursos completos<br />da Academia Verbo.</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Teologia, pregação e formação ministerial — tudo organizado em aulas progressivas.</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 w-full max-w-xs text-left space-y-3">
            {['Cursos de teologia simplificada', 'Pregação na prática', 'Novos cursos todo mês', 'Progresso salvo automaticamente'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0"><CheckCircle size={11} className="text-green-500" /></div>
                <p className="text-xs font-semibold text-slate-600">{item}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { try { navigate('/upgrade?motivo=academia'); } catch { window.location.href = '/upgrade?motivo=academia'; } }}
            className="w-full max-w-xs bg-[#5B2DFF] text-white py-5 rounded-[24px] font-black shadow-xl shadow-purple-200 hover:bg-[#4a22e0] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} /> VER PLANOS
          </button>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">A partir de R$9,90/mês</p>
        </div>
      </div>
    );
  }

  // ─── Academia liberada (isPlus = true) ───────────────────────────────────────
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
            // isPlus tem acesso a TODOS os cursos, independente de matrícula individual
            const temAcesso = isPlus || curso.temMatricula;

            return (
              <div
                key={curso.id}
                className={`relative overflow-hidden rounded-[28px] border transition-all duration-300 ${
                  curso.concluido
                    ? 'border-green-100 bg-green-50/30'
                    : temAcesso
                      ? 'border-slate-100 bg-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {curso.concluido && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                    <CheckCircle size={10} /> Concluído
                  </div>
                )}

                <div className="flex gap-4 p-4">
                  <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#5B2DFF] to-[#D946EF] flex items-center justify-center">
                    {curso.thumb_url || curso.capa_url ? (
                      <img src={curso.thumb_url || curso.capa_url} alt={curso.titulo} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="text-white font-black text-2xl opacity-60">{curso.titulo?.charAt(0) || 'V'}</span>
                    )}
                    {!temAcesso && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                        <Lock size={18} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 leading-tight mb-1 text-sm">{curso.titulo}</h3>
                    {curso.totalAulas > 0 && (
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">
                        {curso.totalAulas} aula{curso.totalAulas !== 1 ? 's' : ''}
                      </span>
                    )}
                    {curso.descricao && (
                      <button onClick={() => toggleDescricao(curso.id)} className="text-left">
                        <p className={`text-[11px] text-gray-500 leading-relaxed transition-all ${expandida ? '' : 'line-clamp-2'}`}>{curso.descricao}</p>
                        <span className="flex items-center gap-0.5 text-[9px] font-black text-[#5B2DFF] uppercase tracking-widest mt-1">
                          {expandida ? 'Ver menos' : 'Ver mais'}
                          <ChevronDown size={10} className={`transition-transform ${expandida ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                    )}
                    {temAcesso && curso.totalAulas > 0 && !curso.concluido && (
                      <div className="mt-2.5 space-y-1">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#5B2DFF] to-[#8B5CF6] rounded-full transition-all duration-700" style={{ width: `${curso.porcentagem}%` }} />
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{curso.aulasFeitas}/{curso.totalAulas} aulas · {curso.porcentagem}%</p>
                      </div>
                    )}
                    {!temAcesso && <span className="text-[10px] text-slate-300 font-bold mt-1.5">Conteúdo bloqueado</span>}
                  </div>

                  <div className="flex flex-col items-center justify-center gap-2 shrink-0">
                    {temAcesso ? (
                      <>
                        <Link to={`/cursos/${curso.id}`} className="p-2.5 bg-purple-50 text-[#5B2DFF] rounded-full hover:bg-purple-100 transition-colors">
                          <ChevronRight size={20} />
                        </Link>
                        {curso.concluido && (
                          <Link to={`/cursos/${curso.id}`} className="p-2 bg-green-50 text-green-500 rounded-full hover:bg-green-100 transition-colors" title="Ver certificado">
                            <Award size={16} />
                          </Link>
                        )}
                      </>
                    ) : (
                      <a href={curso.checkout_url || '#'} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-[#5B2DFF] text-white text-[10px] font-black rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#4a22e0] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap">
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