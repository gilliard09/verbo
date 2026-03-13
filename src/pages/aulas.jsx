import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlano } from '../hooks/usePlano';
import { gerarCertificado } from '../utils/gerarCertificado';
import { supabase } from '../supabaseClient';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  ChevronLeft, Play, CheckCircle,
  Loader2, Lightbulb, LightbulbOff, ChevronRight,
  Lock, Trophy, ShoppingCart, FileText, Eye, Download, ExternalLink,
  RefreshCw, ChevronUp, ChevronDown
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
    const timer = setTimeout(() => { setPecas([]); onFim?.(); }, 2800);
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
          <ConfettiPiece key={p.id} style={{ left: p.left, top: '-20px', width: p.width, height: p.height, background: p.background, animationDelay: p.animationDelay, animationDuration: p.animationDuration, transform: p.transform }}
            className="absolute rounded-sm pointer-events-none confetti-piece" />
        ))}
      </div>
    </>
  );
};

// ─── Toast de conclusão ────────────────────────────────────────────────────────
const ToastConclusao = ({ visivel, titulo }) => (
  <div className={`fixed bottom-8 left-1/2 z-[150] transition-all duration-500 ${visivel ? '-translate-x-1/2 translate-y-0 opacity-100 scale-100' : '-translate-x-1/2 translate-y-8 opacity-0 scale-95 pointer-events-none'}`}>
    <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-[24px] shadow-2xl border border-white/10">
      <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center shrink-0"><CheckCircle size={20} /></div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Aula concluída!</p>
        <p className="text-xs font-bold text-slate-300 truncate max-w-[220px]">{titulo}</p>
      </div>
    </div>
  </div>
);

// ─── Leitor de PDF com retry automático ───────────────────────────────────────
const LeitorPDF = ({ url, titulo }) => {
  const [tentativa, setTentativa] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);

  // Gera URL com cache-bust a cada tentativa
  const srcViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true&t=${tentativa}`;

  useEffect(() => {
    setCarregando(true);
    setFalhou(false);

    // O Google Docs Viewer não dispara onLoad confiável — usamos timeout
    // Se em 8s ainda não carregou, tenta de novo (máx 3 vezes)
    timerRef.current = setTimeout(() => {
      if (carregando) {
        if (tentativa < 3) {
          setTentativa(t => t + 1);
        } else {
          setFalhou(true);
          setCarregando(false);
        }
      }
    }, 8000);

    return () => clearTimeout(timerRef.current);
  }, [tentativa]);

  const retentar = () => {
    setFalhou(false);
    setCarregando(true);
    setTentativa(t => t + 1);
  };

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {carregando && !falhou && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 rounded-2xl gap-3">
          <Loader2 className="animate-spin text-[#5B2DFF]" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {tentativa === 0 ? 'Carregando apostila...' : `Tentando novamente... (${tentativa}/3)`}
          </p>
        </div>
      )}

      {/* Falhou após 3 tentativas */}
      {falhou ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 rounded-2xl gap-4 p-6 text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
            <FileText size={22} className="text-orange-400" />
          </div>
          <div>
            <p className="font-black text-slate-700 text-sm mb-1">Visualizador indisponível</p>
            <p className="text-slate-400 text-xs">O Google Docs está lento. Use uma das opções abaixo.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={retentar}
              className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all">
              <RefreshCw size={13} /> Tentar novamente
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 bg-[#5B2DFF] text-white rounded-2xl font-black text-[10px] uppercase active:scale-95 transition-all">
              <ExternalLink size={13} /> Abrir PDF
            </a>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          key={tentativa}
          src={srcViewer}
          className="w-full h-full"
          title={titulo}
          onLoad={() => {
            clearTimeout(timerRef.current);
            setCarregando(false);
          }}
        />
      )}
    </div>
  );
};

// ─── Componente principal ──────────────────────────────────────────────────────
const Aulas = () => {
  const { cursoId } = useParams();
  const { isAssinante, temAcessoCurso, loading: loadingPlano } = usePlano();
  const [aulas, setAulas] = useState([]);
  const [aulaAtiva, setAulaAtiva] = useState(null);
  const [concluidas, setConcluidas] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [temAcessoMatricula, setTemAcessoMatricula] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [modoCinema, setModoCinema] = useState(false);
  const [dadosCurso, setDadosCurso] = useState(null);
  const [visualizarPDF, setVisualizarPDF] = useState(false);
  const [baixandoPDF, setBaixandoPDF] = useState(false);

  const [celebrando, setCelebrando] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [toastTitulo, setToastTitulo] = useState('');

  const aulaAtivaRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => { carregarConteudo(); }, [cursoId]);
  useEffect(() => { setVisualizarPDF(false); }, [aulaAtiva]);
  useEffect(() => {
    if (aulaAtivaRef.current && sidebarRef.current) {
      aulaAtivaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [aulaAtiva]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const indexAtual = aulas.findIndex(a => a.id === aulaAtiva?.id);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (indexAtual < aulas.length - 1) setAulaAtiva(aulas[indexAtual + 1]); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (indexAtual > 0) setAulaAtiva(aulas[indexAtual - 1]); }
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

      setTemAcessoMatricula(matricula?.status === 'ativo');

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

  const handleGerarCertificado = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const nomeAluno = user.user_metadata?.full_name || user.email.split('@')[0];
    const nomeCurso = dadosCurso?.titulo || 'Curso Ministerial';
    const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const hash = (user.id || '').slice(0, 4).toUpperCase();
    const codigoValidacao = `VERBO-${hash}-${new Date().getFullYear()}`;
    gerarCertificado({ nomeAluno, nomeCurso, dataFormatada, codigoValidacao });
  };

  // ─── Download com branding Verbo ──────────────────────────────────────────────
  const baixarPDFComBranding = async () => {
    if (!aulaAtiva?.material_url) return;
    setBaixandoPDF(true);
    try {
      const response = await fetch(aulaAtiva.material_url);
      const pdfBytes = await response.arrayBuffer();

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const roxo       = rgb(0.357, 0.176, 1.0);
      const roxoClaro  = rgb(0.545, 0.369, 1.0);
      const branco     = rgb(1, 1, 1);
      const cinzaClaro = rgb(0.6, 0.6, 0.6);

      const capaPage = pdfDoc.insertPage(0, [595, 842]);
      capaPage.drawRectangle({ x: 0, y: 0,   width: 595, height: 842, color: roxo });
      capaPage.drawRectangle({ x: 0, y: 600, width: 595, height: 242, color: roxoClaro, opacity: 0.3 });
      capaPage.drawRectangle({ x: 0, y: 0,   width: 8,   height: 842, color: branco, opacity: 0.15 });
      capaPage.drawRectangle({ x: 40, y: 260, width: 515, height: 300, color: branco, opacity: 0.06 });

      capaPage.drawText('VERBO', { x: 40, y: 740, size: 52, font: helveticaBold, color: branco });
      capaPage.drawText('appverbo.com.br', { x: 40, y: 715, size: 11, font: helvetica, color: rgb(0.8, 0.7, 1.0) });
      capaPage.drawLine({ start: { x: 40, y: 700 }, end: { x: 555, y: 700 }, thickness: 1, color: branco, opacity: 0.2 });
      capaPage.drawText('MATERIAL DE APOIO', { x: 40, y: 650, size: 10, font: helveticaBold, color: rgb(0.8, 0.7, 1.0) });

      const nomeCurso  = dadosCurso?.titulo || 'Curso Ministerial';
      const tituloAula = aulaAtiva?.titulo   || '';
      const palavrasCurso = nomeCurso.split(' ');
      let linhaCurso = '';
      let linhasCurso = [];
      for (const palavra of palavrasCurso) {
        const teste = linhaCurso ? `${linhaCurso} ${palavra}` : palavra;
        if (helveticaBold.widthOfTextAtSize(teste, 32) > 510) { linhasCurso.push(linhaCurso); linhaCurso = palavra; }
        else { linhaCurso = teste; }
      }
      if (linhaCurso) linhasCurso.push(linhaCurso);

      let yCurso = 620;
      for (const linha of linhasCurso) {
        capaPage.drawText(linha, { x: 40, y: yCurso, size: 32, font: helveticaBold, color: branco });
        yCurso -= 42;
      }
      capaPage.drawText(tituloAula, { x: 40, y: yCurso - 16, size: 16, font: helvetica, color: rgb(0.85, 0.78, 1.0), maxWidth: 510 });
      capaPage.drawText('Verbo — Tecnologia para quem prega', { x: 40, y: 60, size: 10, font: helvetica, color: branco, opacity: 0.5 });
      capaPage.drawText(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, { x: 40, y: 44, size: 9, font: helvetica, color: branco, opacity: 0.35 });

      const totalPaginas = pdfDoc.getPageCount();
      for (let i = 1; i < totalPaginas; i++) {
        const page = pdfDoc.getPage(i);
        const { width } = page.getSize();
        page.drawLine({ start: { x: 30, y: 28 }, end: { x: width - 30, y: 28 }, thickness: 0.8, color: roxo, opacity: 0.4 });
        page.drawText('VERBO', { x: 30, y: 14, size: 8, font: helveticaBold, color: roxo, opacity: 0.7 });
        page.drawText('appverbo.com.br', { x: 76, y: 14, size: 8, font: helvetica, color: cinzaClaro, opacity: 0.7 });
        const numPag = `${i} / ${totalPaginas - 1}`;
        const larguraNum = helvetica.widthOfTextAtSize(numPag, 8);
        page.drawText(numPag, { x: width - 30 - larguraNum, y: 14, size: 8, font: helvetica, color: cinzaClaro, opacity: 0.7 });
      }

      const pdfFinal = await pdfDoc.save();
      const blob = new Blob([pdfFinal], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nomeArquivo = `Verbo — ${nomeCurso} — ${tituloAula}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
      link.href = url; link.download = nomeArquivo; link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF com branding:', err);
      window.open(aulaAtiva.material_url, '_blank');
    } finally {
      setBaixandoPDF(false);
    }
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
  const irParaProxima  = () => { if (indexAtual < aulas.length - 1) { setAulaAtiva(aulas[indexAtual + 1]); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const irParaAnterior = () => { if (indexAtual > 0) { setAulaAtiva(aulas[indexAtual - 1]); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const porcentagem = aulas.length > 0 ? Math.round((concluidas.size / aulas.length) * 100) : 0;

  if (loading || loadingPlano) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Preparando aulas...</p>
    </div>
  );

  const acessoPorPlano = temAcessoCurso(dadosCurso);
  if (!acessoPorPlano && !temAcessoMatricula) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
        <Lock size={48} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-4 italic uppercase tracking-tighter">Área Restrita</h2>
      {isAssinante && dadosCurso?.plano_minimo === 'plus' && (
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          Este curso requer o plano <span className="font-black text-[#5B2DFF]">Plus</span>. Faça upgrade para acessar.
        </p>
      )}
      <a href={dadosCurso?.checkout_url || '#'} target="_blank" rel="noopener noreferrer"
        className="bg-[#5B2DFF] text-white px-12 py-5 rounded-3xl font-black text-xs uppercase shadow-2xl flex items-center gap-3">
        <ShoppingCart size={16} /> GARANTIR MEU ACESSO
      </a>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-500 ${modoCinema ? 'bg-black' : 'bg-[#F8FAFC]'}`}>

      <Celebracao ativo={celebrando} onFim={() => setCelebrando(false)} />
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
          <div className={`relative overflow-hidden shadow-2xl transition-all duration-700 ${modoCinema ? 'md:rounded-none' : 'md:rounded-[40px] rounded-none'} bg-black`}>
            <div className="aspect-video w-full">
              {aulaAtiva && (
                <iframe className="w-full h-full" src={formatarVideoUrl(aulaAtiva.video_url)}
                  title={aulaAtiva.titulo} frameBorder="0" allowFullScreen />
              )}
            </div>
          </div>

          <div className={`px-4 md:px-0 transition-opacity duration-500 ${modoCinema ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="flex items-center justify-between gap-4 mb-6">
              <button onClick={irParaAnterior} disabled={indexAtual === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${indexAtual === 0 ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400 bg-white' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-md active:scale-95'}`}>
                <ChevronLeft size={16} />
                {indexAtual > 0 ? <span className="hidden sm:inline truncate max-w-[140px]">{aulas[indexAtual - 1]?.titulo}</span> : <span>Anterior</span>}
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">{indexAtual + 1} / {aulas.length}</span>
              <button onClick={irParaProxima} disabled={indexAtual === aulas.length - 1}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase transition-all border ${indexAtual === aulas.length - 1 ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400 bg-white' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-md active:scale-95'}`}>
                {indexAtual < aulas.length - 1 ? <span className="hidden sm:inline truncate max-w-[140px]">{aulas[indexAtual + 1]?.titulo}</span> : <span>Próxima</span>}
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tighter">{aulaAtiva?.titulo}</h2>
              <button onClick={() => alternarConclusao(aulaAtiva.id)}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] font-black text-xs transition-all shadow-xl active:scale-95 ${concluidas.has(aulaAtiva?.id) ? 'bg-green-500 text-white' : 'bg-[#5B2DFF] text-white hover:bg-[#4a22e0]'}`}>
                {btnLoading ? <Loader2 className="animate-spin" size={18} /> : concluidas.has(aulaAtiva?.id) ? <><CheckCircle size={18} /> CONCLUÍDA</> : <><Play size={18} fill="currentColor" /> MARCAR COMO VISTA</>}
              </button>
            </div>

            {/* ── Material de Apoio ─────────────────────────────────────────────── */}
            {aulaAtiva?.material_url && (
              <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden transition-all duration-500">
                <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-[#5B2DFF] rounded-3xl"><FileText size={28} /></div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Material de Apoio</h4>
                      <p className="text-slate-400 text-xs font-medium">Apostila em PDF disponível para esta aula.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setVisualizarPDF(!visualizarPDF)}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${visualizarPDF ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-white'}`}>
                      <Eye size={16} /> {visualizarPDF ? 'Fechar Leitor' : 'Ver Apostila'}
                    </button>
                    <button
                      onClick={baixarPDFComBranding}
                      disabled={baixandoPDF}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-[10px] uppercase transition-all hover:bg-[#4a22e0] shadow-lg shadow-purple-100 disabled:opacity-60 active:scale-95">
                      {baixandoPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {baixandoPDF ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  </div>
                </div>

                {visualizarPDF && (
                  <div className="border-t border-slate-100">
                    {/* Header visual Verbo */}
                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[#5B2DFF] to-[#8B5CF6]">
                      <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-200">Material de Apoio</p>
                        <p className="text-xs font-black text-white truncate">{aulaAtiva?.titulo}</p>
                      </div>
                      <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest shrink-0">Verbo</span>
                    </div>

                    <div className="p-4 bg-slate-50">
                      <div className="aspect-[1/1.4] md:aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white">
                        <LeitorPDF url={aulaAtiva.material_url} titulo={aulaAtiva?.titulo} />
                      </div>
                      <div className="mt-4 flex justify-center">
                        <a href={aulaAtiva.material_url} target="_blank"
                          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-[#5B2DFF] transition-colors">
                          <ExternalLink size={12} /> Abrir em tela cheia
                        </a>
                      </div>
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
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Conteúdo do Curso</h4>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{concluidas.size}/{aulas.length} aulas</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${porcentagem}%`, background: porcentagem === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #5B2DFF, #8B5CF6)' }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {porcentagem === 0 ? 'Começar curso' : porcentagem === 100 ? '🎉 Curso concluído!' : `${porcentagem}% concluído`}
                  </span>
                  {porcentagem > 0 && porcentagem < 100 && (
                    <span className="text-[10px] font-bold text-slate-300">{aulas.length - concluidas.size} restante{aulas.length - concluidas.size !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </div>

            <div ref={sidebarRef} className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {aulas.map((aula, idx) => (
                  <button key={aula.id} ref={aulaAtiva?.id === aula.id ? aulaAtivaRef : null}
                    onClick={() => { setAulaAtiva(aula); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${aulaAtiva?.id === aula.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-700'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${aulaAtiva?.id === aula.id ? 'bg-[#5B2DFF]' : concluidas.has(aula.id) ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-400'}`}>
                      {concluidas.has(aula.id) ? <CheckCircle size={18} /> : <span className="text-[11px] font-black">{idx + 1}</span>}
                    </div>
                    <span className="text-[13px] font-bold truncate text-left flex-1">{aula.titulo}</span>
                    {aulaAtiva?.id === aula.id && <div className="w-2 h-2 rounded-full bg-[#5B2DFF] animate-pulse shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {porcentagem === 100 && (
              <div className="p-6 bg-gradient-to-br from-yellow-400 to-orange-500 m-4 rounded-[32px] text-white text-center shadow-lg">
                <Trophy size={24} className="mx-auto mb-2" />
                <h5 className="font-black text-xs uppercase italic tracking-tighter">Parabéns! Curso Concluído!</h5>
                <button onClick={handleGerarCertificado}
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