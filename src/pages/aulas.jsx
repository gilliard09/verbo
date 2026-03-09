import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { jsPDF } from "jspdf";
import {
  ChevronLeft, Play, CheckCircle,
  Loader2, Lightbulb, LightbulbOff, ChevronRight,
  Lock, Trophy, ShoppingCart, FileText, Eye, Download, ExternalLink,
  ChevronUp, ChevronDown
} from 'lucide-react';

// ─── Componente de Confetti ────────────────────────────────────────────────────
const ConfettiPiece = ({ style }) => <div className="absolute rounded-sm pointer-events-none" style={style} />;

const Celebracao = ({ ativo, onFim }) => {
  const [pecas, setPecas] = useState([]);

  useEffect(() => {
    if (!ativo) return;

    const cores = ['#5B2DFF', '#FF6B35', '#FFD700', '#00C896', '#FF3CAC', '#fff'];
    const novasPecas = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 8 + 4}px`,
      height: `${Math.random() * 12 + 6}px`,
      background: cores[Math.floor(Math.random() * cores.length)],
      animationDelay: `${Math.random() * 0.6}s`,
      animationDuration: `${Math.random() * 1.2 + 0.8}s`,
      transform: `rotate(${Math.random() * 360}deg)`,
    }));
    setPecas(novasPecas);

    const timer = setTimeout(() => {
      setPecas([]);
      onFim?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, [ativo]);

  if (!ativo && pecas.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece { animation: confetti-fall linear forwards; }
      `}</style>
      <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
        {pecas.map(p => (
          <ConfettiPiece
            key={p.id}
            style={{
              left: p.left,
              top: '-20px',
              width: p.width,
              height: p.height,
              background: p.background,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
              transform: p.transform,
            }}
            className="absolute rounded-sm pointer-events-none confetti-piece"
          />
        ))}
      </div>
    </>
  );
};

// ─── Toast de conclusão ────────────────────────────────────────────────────────
const ToastConclusao = ({ visivel, titulo }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[150] transition-all duration-500 ${
      visivel
        ? '-translate-x-1/2 translate-y-0 opacity-100 scale-100'
        : '-translate-x-1/2 translate-y-8 opacity-0 scale-95 pointer-events-none'
    }`}
  >
    <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl border border-white/10">
      <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shrink-0">
        <CheckCircle size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Aula concluída!</p>
        <p className="text-xs font-bold text-slate-300 truncate max-w-[220px]">{titulo}</p>
      </div>
    </div>
  </div>
);

// ─── Componente principal ──────────────────────────────────────────────────────
const Aulas = () => {
  const { cursoId } = useParams();
  const [aulas, setAulas] = useState([]);
  const [aulaAtiva, setAulaAtiva] = useState(null);
  const [concluidas, setConcluidas] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [modoCinema, setModoCinema] = useState(false);
  const [dadosCurso, setDadosCurso] = useState(null);
  const [visualizarPDF, setVisualizarPDF] = useState(false);

  // Celebração
  const [celebrando, setCelebrando] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [toastTitulo, setToastTitulo] = useState('');

  // Scroll da sidebar para aula ativa
  const aulaAtivaRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    carregarConteudo();
  }, [cursoId]);

  useEffect(() => {
    setVisualizarPDF(false);
  }, [aulaAtiva]);

  // Scroll automático da sidebar para o item ativo
  useEffect(() => {
    if (aulaAtivaRef.current && sidebarRef.current) {
      aulaAtivaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [aulaAtiva]);

  // ─── Navegação por teclado ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Não interceptar se o foco estiver em inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const indexAtual = aulas.findIndex(a => a.id === aulaAtiva?.id);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (indexAtual < aulas.length - 1) setAulaAtiva(aulas[indexAtual + 1]);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (indexAtual > 0) setAulaAtiva(aulas[indexAtual - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aulas, aulaAtiva]);

  const carregarConteudo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: cursoBD } = await supabase.from('cursos').select('*').eq('id', cursoId).single();
      setDadosCurso(cursoBD);

      const { data: matricula } = await supabase
        .from('matriculas').select('status')
        .eq('user_id', user.id).eq('curso_id', cursoId).maybeSingle();

      if (!matricula || matricula.status !== 'ativo') {
        setTemAcesso(false); setLoading(false); return;
      }

      const { data: listaAulas } = await supabase
        .from('aulas').select('*').eq('curso_id', cursoId).order('ordem', { ascending: true });

      const { data: progresso } = await supabase
        .from('progresso_aulas').select('aula_id, aulas!inner(curso_id)')
        .eq('user_id', user.id).eq('aulas.curso_id', cursoId);

      if (listaAulas?.length > 0) {
        setAulas(listaAulas);
        setAulaAtiva(listaAulas[0]);
        setConcluidas(new Set(progresso?.map(p => p.aula_id)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const gerarCertificado = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    try { doc.addImage("/logo.png", "PNG", 20, 15, 12, 12); } catch (e) {}
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.setTextColor(91, 45, 255);
    doc.text("Academia Verbo", 35, 23);
    doc.setDrawColor(91, 45, 255); doc.setLineWidth(1);
    doc.rect(10, 10, 277, 190);
    doc.setFont("helvetica", "bold"); doc.setFontSize(42);
    doc.text("CERTIFICADO", 148.5, 60, { align: "center" });
    doc.setFontSize(30); doc.setTextColor(91, 45, 255);
    doc.setFont("times", "bolditalic");
    const nome = user.user_metadata?.full_name || user.email;
    doc.text(nome.toUpperCase(), 148.5, 100, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    doc.text(`"${dadosCurso?.titulo || "Curso Ministerial"}"`, 148.5, 135, { align: "center" });
    doc.setFont("times", "italic"); doc.setFontSize(20);
    doc.text("Pr. Jeferson Rocha", 148.5, 178, { align: "center" });
    doc.save(`Certificado-${dadosCurso?.titulo}.pdf`);
  };

  const formatarVideoUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('watch?v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('embed/')) return url;
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=1` : url;
  };

  const dispararCelebracao = useCallback((titulo) => {
    setToastTitulo(titulo);
    setCelebrando(true);
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 2500);
  }, []);

  const alternarConclusao = async (aulaId) => {
    setBtnLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const jaConcluida = concluidas.has(aulaId);
    const aulaConcluidaTitulo = aulas.find(a => a.id === aulaId)?.titulo || '';

    try {
      if (jaConcluida) {
        await supabase.from('progresso_aulas').delete().eq('user_id', user.id).eq('aula_id', aulaId);
        concluidas.delete(aulaId);
      } else {
        await supabase.from('progresso_aulas').insert({ user_id: user.id, aula_id: aulaId });
        concluidas.add(aulaId);
        dispararCelebracao(aulaConcluidaTitulo);
        setTimeout(irParaProxima, 1200);
      }
      setConcluidas(new Set(concluidas));
    } catch (error) {
      console.error(error);
    } finally {
      setBtnLoading(false);
    }
  };

  const indexAtual = aulas.findIndex(a => a.id === aulaAtiva?.id);
  const irParaProxima = () => {
    if (indexAtual < aulas.length - 1) {
      setAulaAtiva(aulas[indexAtual + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const irParaAnterior = () => {
    if (indexAtual > 0) {
      setAulaAtiva(aulas[indexAtual - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const porcentagem = aulas.length > 0 ? Math.round((concluidas.size / aulas.length) * 100) : 0;

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Preparando aulas...</p>
    </div>
  );

  // ─── Sem acesso ───────────────────────────────────────────────────────────────
  if (!temAcesso) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
        <Lock size={48} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-4 italic uppercase tracking-tighter">Área Restrita</h2>
      <a href={dadosCurso?.checkout_url || "#"} target="_blank" rel="noopener noreferrer"
        className="bg-[#5B2DFF] text-white px-12 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl flex items-center gap-3">
        <ShoppingCart size={16} /> GARANTIR MEU ACESSO
      </a>
    </div>
  );

  // ─── Render principal ─────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-all duration-500 ${modoCinema ? 'bg-black' : 'bg-[#F8FAFC]'}`}>

      {/* Celebração confetti */}
      <Celebracao ativo={celebrando} onFim={() => setCelebrando(false)} />

      {/* Toast de conclusão */}
      <ToastConclusao visivel={toastVisivel} titulo={toastTitulo} />

      {/* ── Header ── */}
      <header className={`sticky top-0 z-[100] border-b backdrop-blur-md transition-all ${modoCinema ? 'bg-black/80 border-white/5' : 'bg-white/80 border-slate-200/60'}`}>
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/cursos" className={`p-2 rounded-xl transition-all ${modoCinema ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <span className={`text-[9px] font-black uppercase tracking-widest ${modoCinema ? 'text-slate-500' : 'text-slate-400'}`}>Aula Ativa</span>
              <h1 className={`text-xs font-black uppercase truncate max-w-[200px] ${modoCinema ? 'text-white' : 'text-slate-800'}`}>{aulaAtiva?.titulo}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Hint de teclado — desktop only */}
            <span className={`hidden md:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest opacity-30 ${modoCinema ? 'text-white' : 'text-slate-500'}`}>
              <kbd className="px-1.5 py-0.5 bg-black/10 rounded text-[9px]">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-black/10 rounded text-[9px]">→</kbd>
              navegar
            </span>
            <button onClick={() => setModoCinema(!modoCinema)}
              className={`p-2.5 rounded-xl transition-all ${modoCinema ? 'bg-yellow-400 text-black' : 'bg-slate-900 text-white'}`}>
              {modoCinema ? <Lightbulb size={18} /> : <LightbulbOff size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto md:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">

        {/* ── Coluna principal ── */}
        <div className="flex-1 space-y-6">

          {/* Player */}
          <div className={`relative overflow-hidden shadow-2xl transition-all duration-700 ${modoCinema ? 'md:rounded-none' : 'md:rounded-[40px] rounded-none'} bg-black`}>
            <div className="aspect-video w-full">
              {aulaAtiva && (
                <iframe className="w-full h-full" src={formatarVideoUrl(aulaAtiva.video_url)}
                  title={aulaAtiva.titulo} frameBorder="0" allowFullScreen />
              )}
            </div>
          </div>

          {/* Controles abaixo do player */}
          <div className={`px-4 md:px-0 transition-opacity duration-500 ${modoCinema ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>

            {/* ── Navegação anterior / próxima ── */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={irParaAnterior}
                disabled={indexAtual === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${
                  indexAtual === 0
                    ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400 bg-white'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-md active:scale-95'
                }`}
              >
                <ChevronLeft size={16} />
                {indexAtual > 0 ? (
                  <span className="hidden sm:inline truncate max-w-[140px]">
                    {aulas[indexAtual - 1]?.titulo}
                  </span>
                ) : (
                  <span>Anterior</span>
                )}
              </button>

              {/* Contador central */}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                {indexAtual + 1} / {aulas.length}
              </span>

              <button
                onClick={irParaProxima}
                disabled={indexAtual === aulas.length - 1}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${
                  indexAtual === aulas.length - 1
                    ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400 bg-white'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-md active:scale-95'
                }`}
              >
                {indexAtual < aulas.length - 1 ? (
                  <span className="hidden sm:inline truncate max-w-[140px]">
                    {aulas[indexAtual + 1]?.titulo}
                  </span>
                ) : (
                  <span>Próxima</span>
                )}
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Título + botão de conclusão */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tighter">
                {aulaAtiva?.titulo}
              </h2>
              <button
                onClick={() => alternarConclusao(aulaAtiva.id)}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] font-black text-xs transition-all shadow-xl active:scale-95 ${
                  concluidas.has(aulaAtiva?.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-[#5B2DFF] text-white hover:bg-[#4a22e0]'
                }`}
              >
                {btnLoading
                  ? <Loader2 className="animate-spin" size={18} />
                  : concluidas.has(aulaAtiva?.id)
                    ? <><CheckCircle size={18} /> CONCLUÍDA</>
                    : <><Play size={18} fill="currentColor" /> MARCAR COMO VISTA</>
                }
              </button>
            </div>

            {/* Material de apoio PDF */}
            {aulaAtiva?.material_url && (
              <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden transition-all duration-500">
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-50 text-orange-500 rounded-3xl"><FileText size={28} /></div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Material de Apoio</h4>
                      <p className="text-slate-400 text-xs font-medium">Apostila em PDF disponível para esta aula.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setVisualizarPDF(!visualizarPDF)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${visualizarPDF ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white'}`}>
                      <Eye size={16} /> {visualizarPDF ? 'Fechar Leitor' : 'Ver Apostila'}
                    </button>
                    <a href={aulaAtiva.material_url} target="_blank" download
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase transition-all hover:bg-orange-600 shadow-lg shadow-orange-100">
                      <Download size={16} /> Baixar PDF
                    </a>
                  </div>
                </div>
                {visualizarPDF && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="aspect-[1/1.4] md:aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white">
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(aulaAtiva.material_url)}&embedded=true`}
                        className="w-full h-full"
                        title="Material de Apoio"
                      />
                    </div>
                    <div className="mt-4 flex justify-center">
                      <a href={aulaAtiva.material_url} target="_blank"
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-[#5B2DFF] transition-colors">
                        <ExternalLink size={12} /> Abrir em tela cheia
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className={`w-full lg:w-[400px] space-y-6 transition-all duration-500 ${modoCinema ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[700px]">

            {/* Header da sidebar com progresso */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Conteúdo do Curso</h4>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {concluidas.size}/{aulas.length} aulas
                </span>
              </div>

              {/* ── Barra de progresso ── */}
              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${porcentagem}%`,
                      background: porcentagem === 100
                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                        : 'linear-gradient(90deg, #5B2DFF, #8B5CF6)'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {porcentagem === 0
                      ? 'Começar curso'
                      : porcentagem === 100
                        ? '🎉 Curso concluído!'
                        : `${porcentagem}% concluído`}
                  </span>
                  {porcentagem > 0 && porcentagem < 100 && (
                    <span className="text-[10px] font-bold text-slate-300">
                      {aulas.length - concluidas.size} restante{aulas.length - concluidas.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de aulas */}
            <div ref={sidebarRef} className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {aulas.map((aula, idx) => (
                  <button
                    key={aula.id}
                    ref={aulaAtiva?.id === aula.id ? aulaAtivaRef : null}
                    onClick={() => { setAulaAtiva(aula); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${
                      aulaAtiva?.id === aula.id
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                      aulaAtiva?.id === aula.id
                        ? 'bg-[#5B2DFF]'
                        : concluidas.has(aula.id)
                          ? 'bg-green-50 text-green-500'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {concluidas.has(aula.id)
                        ? <CheckCircle size={18} />
                        : <span className="text-[11px] font-black">{idx + 1}</span>
                      }
                    </div>
                    <span className="text-[13px] font-bold truncate text-left flex-1">{aula.titulo}</span>
                    {aulaAtiva?.id === aula.id && (
                      <div className="w-2 h-2 rounded-full bg-[#5B2DFF] animate-pulse shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Certificado ao 100% */}
            {porcentagem === 100 && (
              <div className="p-6 bg-gradient-to-br from-yellow-400 to-orange-500 m-4 rounded-[32px] text-white text-center shadow-lg">
                <Trophy size={24} className="mx-auto mb-2" />
                <h5 className="font-black text-xs uppercase italic tracking-tighter">Parabéns! Curso Concluído!</h5>
                <button onClick={gerarCertificado}
                  className="mt-3 w-full py-3 bg-white text-orange-500 rounded-2xl font-black text-[10px] uppercase hover:bg-orange-50 transition-colors">
                  Emitir Certificado
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Aulas;