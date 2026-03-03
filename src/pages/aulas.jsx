import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { jsPDF } from "jspdf"; 
import { 
  ChevronLeft, Play, Clock, CheckCircle, Circle, 
  Loader2, Lightbulb, LightbulbOff, ChevronRight,
  PenLine, Lock, Monitor, Smartphone, Trophy, Sparkles,
  ShoppingCart
} from 'lucide-react';

const Aulas = () => {
  const { cursoId } = useParams();
  const [aulas, setAulas] = useState([]);
  const [aulaAtiva, setAulaAtiva] = useState(null);
  const [concluidas, setConcluidas] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [modoCinema, setModoCinema] = useState(false);
  const [anotacao, setAnotacao] = useState("");
  const [salvandoAnotacao, setSalvandoAnotacao] = useState(false);
  const [dadosCurso, setDadosCurso] = useState(null);

  useEffect(() => {
    carregarConteudo();
  }, [cursoId]);

  const carregarConteudo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: cursoBD } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', cursoId)
        .single();
      
      setDadosCurso(cursoBD);

      const { data: matricula } = await supabase
        .from('matriculas')
        .select('status')
        .eq('user_id', user.id)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (!matricula || matricula.status !== 'ativo') {
        setTemAcesso(false);
        setLoading(false);
        return;
      }

      // 1. Busca as aulas DESTE curso
      const { data: listaAulas } = await supabase
        .from('aulas')
        .select('*')
        .eq('curso_id', cursoId)
        .order('ordem', { ascending: true });
        
      // 2. CORREÇÃO: Busca o progresso filtrando apenas aulas que pertencem a este cursoId
      const { data: progresso } = await supabase
        .from('progresso_aulas')
        .select('aula_id, aulas!inner(curso_id)') 
        .eq('user_id', user.id)
        .eq('aulas.curso_id', cursoId);

      if (listaAulas && listaAulas.length > 0) {
        setAulas(listaAulas);
        setAulaAtiva(listaAulas[0]);
        // Armazena apenas os IDs das aulas concluídas deste curso específico
        setConcluidas(new Set(progresso?.map(p => p.aula_id)));
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- FUNÇÃO ATUALIZADA: GERAR CERTIFICADO COM LOGO E ASSINATURA ---
  const gerarCertificado = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // 1. Inserir Logo e Nome da Marca (Cabeçalho)
    try {
      doc.addImage("/logo.png", "PNG", 20, 15, 12, 12); 
    } catch (e) {
      console.warn("Logo não encontrada");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(91, 45, 255); 
    doc.text("Academia Verbo", 35, 23);

    // 2. Moldura Sofisticada
    doc.setDrawColor(91, 45, 255); 
    doc.setLineWidth(1);
    doc.rect(10, 10, 277, 190); 
    doc.setLineWidth(0.2);
    doc.rect(12, 12, 273, 186); 

    // 3. Título Central
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.setTextColor(30, 41, 59);
    doc.text("CERTIFICADO", 148.5, 60, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text("Certificamos para os devidos fins que o(a) aluno(a)", 148.5, 80, { align: "center" });

    // 4. Nome do Aluno
    doc.setFontSize(30);
    doc.setTextColor(91, 45, 255);
    doc.setFont("times", "bolditalic"); 
    const nomeIdentificado = user.user_metadata?.full_name || user.email;
    doc.text(nomeIdentificado.toUpperCase(), 148.5, 100, { align: "center" });

    // 5. Descrição do Curso
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(`concluiu com êxito todos os módulos do treinamento:`, 148.5, 120, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(`"${dadosCurso?.titulo || "Curso Ministerial"}"`, 148.5, 135, { align: "center" });

    // 6. Data e Rodapé
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 148.5, 160, { align: "center" });

    // 7. Assinatura Elegante
    doc.setDrawColor(200, 200, 200);
    doc.line(100, 182, 200, 182); // Linha da assinatura

    doc.setFont("times", "italic"); // Fonte cursiva/clássica
    doc.setFontSize(20);
    doc.text("Pr. Jeferson Rocha", 148.5, 178, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("ACADEMIA VERBO", 148.5, 188, { align: "center" });

    doc.save(`Certificado-${dadosCurso?.titulo}.pdf`);
  };

  const salvarAnotacaoNoBanco = async (novoConteudo) => {
    setSalvandoAnotacao(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('anotacoes_aulas').upsert({
        user_id: user.id,
        aula_id: aulaAtiva.id,
        conteudo: novoConteudo,
        updated_at: new Date()
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSalvandoAnotacao(false);
    }
  };

  useEffect(() => {
    const carregarAnotacao = async () => {
      if (!aulaAtiva || !temAcesso) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('anotacoes_aulas').select('conteudo').eq('aula_id', aulaAtiva.id).eq('user_id', user.id).maybeSingle();
      setAnotacao(data?.conteudo || "");
    };
    carregarAnotacao();
  }, [aulaAtiva, temAcesso]);

  const formatarVideoUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('watch?v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('embed/')) return url;
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&autoplay=1` : url;
  };

  const alternarConclusao = async (aulaId) => {
    setBtnLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const jaConcluida = concluidas.has(aulaId);

    try {
      if (jaConcluida) {
        await supabase.from('progresso_aulas').delete().eq('user_id', user.id).eq('aula_id', aulaId);
        concluidas.delete(aulaId);
      } else {
        await supabase.from('progresso_aulas').insert({ user_id: user.id, aula_id: aulaId });
        concluidas.add(aulaId);
        setTimeout(irParaProxima, 1000);
      }
      setConcluidas(new Set(concluidas));
    } catch (error) { console.error(error); } finally { setBtnLoading(false); }
  };

  const indexAtual = aulas.findIndex(a => a.id === aulaAtiva?.id);
  const irParaProxima = () => { if (indexAtual < aulas.length - 1) setAulaAtiva(aulas[indexAtual + 1]); };
  const irParaAnterior = () => { if (indexAtual > 0) setAulaAtiva(aulas[indexAtual - 1]); };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 className="animate-spin text-[#5B2DFF] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Preparando Altar...</p>
    </div>
  );

  if (!temAcesso) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
        <Lock size={48} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-4 italic uppercase tracking-tighter">Área Restrita</h2>
      <p className="text-slate-500 max-w-sm mb-10 font-medium leading-relaxed">
        O conteúdo {dadosCurso?.titulo ? `"${dadosCurso.titulo}"` : ""} é exclusivo para membros. 
        Sua jornada ministerial começa com um sim.
      </p>
      
      <a 
        href={dadosCurso?.checkout_url || "https://pay.hotmart.com/V93818610J"} 
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#5B2DFF] text-white px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-purple-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
      >
        <ShoppingCart size={16} /> GARANTIR MEU ACESSO
      </a>

      <Link to="/cursos" className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#5B2DFF] transition-colors">
        Voltar para a Galeria
      </Link>
    </div>
  );

  const porcentagem = aulas.length > 0 ? Math.round((concluidas.size / aulas.length) * 100) : 0;

  return (
    <div className={`min-h-screen transition-all duration-500 ${modoCinema ? 'bg-black' : 'bg-[#F8FAFC]'}`}>
      
      <header className={`sticky top-0 z-[100] border-b backdrop-blur-md transition-all ${modoCinema ? 'bg-black/80 border-white/5' : 'bg-white/80 border-slate-200/60'}`}>
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/cursos" className={`p-2 rounded-xl transition-all ${modoCinema ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft size={20} />
            </Link>
            <div className="hidden md:block h-6 w-[1px] bg-slate-200 mx-2" />
            <div className="flex flex-col">
              <span className={`text-[9px] font-black uppercase tracking-widest ${modoCinema ? 'text-slate-500' : 'text-slate-400'}`}>Módulo Atual</span>
              <h1 className={`text-xs font-black uppercase truncate max-w-[200px] ${modoCinema ? 'text-white' : 'text-slate-800'}`}>{aulaAtiva?.titulo}</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seu Progresso</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5B2DFF] transition-all duration-1000" style={{ width: `${porcentagem}%` }} />
                </div>
                <span className="text-[10px] font-black text-[#5B2DFF]">{porcentagem}%</span>
              </div>
            </div>
            <button onClick={() => setModoCinema(!modoCinema)} className={`p-2.5 rounded-xl transition-all ${modoCinema ? 'bg-yellow-400 text-black' : 'bg-slate-900 text-white'}`}>
              {modoCinema ? <Lightbulb size={18} /> : <LightbulbOff size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto md:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        <div className="flex-1 space-y-6">
          <div className={`relative group overflow-hidden shadow-2xl transition-all duration-700 ${modoCinema ? 'md:rounded-none' : 'md:rounded-[40px] rounded-none'} bg-black`}>
             <div className="aspect-video w-full">
                {aulaAtiva && (
                  <iframe 
                    className="w-full h-full" 
                    src={formatarVideoUrl(aulaAtiva.video_url)} 
                    title={aulaAtiva.titulo} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                )}
             </div>
             
             <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                <button onClick={irParaAnterior} disabled={indexAtual === 0} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all disabled:opacity-20"><ChevronLeft size={20}/></button>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black text-white/60 uppercase">Aula {indexAtual + 1} de {aulas.length}</span>
                </div>
                <button onClick={irParaProxima} disabled={indexAtual === aulas.length - 1} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all disabled:opacity-20"><ChevronRight size={20}/></button>
             </div>
          </div>

          <div className={`px-4 md:px-0 space-y-6 transition-opacity duration-500 ${modoCinema ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Em reprodução</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">{aulaAtiva?.titulo}</h2>
              </div>
              
              <button 
                onClick={() => alternarConclusao(aulaAtiva.id)} 
                disabled={btnLoading}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-[24px] font-black text-xs transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  concluidas.has(aulaAtiva?.id) 
                  ? 'bg-green-500 text-white shadow-green-200' 
                  : 'bg-[#5B2DFF] text-white shadow-purple-200'
                }`}
              >
                {btnLoading ? <Loader2 className="animate-spin" size={18} /> : concluidas.has(aulaAtiva?.id) ? <><CheckCircle size={18} /> AULA CONCLUÍDA</> : <><Play size={18} fill="currentColor" /> MARCAR COMO VISTA</>}
              </button>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-[#5B2DFF] rounded-xl"><PenLine size={18} /></div>
                  <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest text-left">Meus Insights Teológicos</h4>
                </div>
                {salvandoAnotacao && <span className="text-[9px] font-black text-[#5B2DFF] animate-pulse">Sincronizando...</span>}
              </div>
              <textarea 
                value={anotacao} 
                onChange={(e) => { 
                  setAnotacao(e.target.value); 
                  clearTimeout(window.saveTimer); 
                  window.saveTimer = setTimeout(() => salvarAnotacaoNoBanco(e.target.value), 1500); 
                }}
                placeholder="O que essa palavra despertou em você?"
                className="w-full bg-slate-50/50 border-none rounded-3xl p-6 text-sm text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-purple-100 transition-all min-h-[160px] resize-none font-medium leading-relaxed"
              />
            </div>
          </div>
        </div>

        <aside className={`w-full lg:w-[400px] space-y-6 transition-all duration-500 ${modoCinema ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-100'}`}>
          <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Conteúdo do Curso</h4>
                <span className="text-[10px] font-bold text-slate-400">{aulas.length} Aulas</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-2">
                {aulas.map((aula, idx) => {
                  const ativa = aulaAtiva?.id === aula.id;
                  const concluida = concluidas.has(aula.id);
                  return (
                    <button 
                      key={aula.id} 
                      onClick={() => { setAulaAtiva(aula); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all group ${
                        ativa ? 'bg-slate-900 shadow-xl shadow-slate-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        ativa ? 'bg-[#5B2DFF] text-white' : concluida ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {concluida ? <CheckCircle size={18} /> : ativa ? <Play size={16} fill="currentColor" /> : <span className="text-[11px] font-black">{idx + 1}</span>}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className={`text-[13px] font-bold truncate w-full text-left ${ativa ? 'text-white' : 'text-slate-700'}`}>
                          {aula.titulo}
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock size={10} className={ativa ? 'text-slate-500' : 'text-slate-300'} />
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${ativa ? 'text-slate-500' : 'text-slate-400'}`}>Vídeo Aula</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD DE CONCLUSÃO CONDICIONAL AO 100% DE PROGRESSO */}
            {porcentagem === 100 && (
              <div className="p-6 bg-gradient-to-br from-yellow-400 to-orange-500 m-4 rounded-[32px] text-white text-center shadow-lg animate-in fade-in zoom-in duration-500">
                <Trophy size={24} className="mx-auto mb-2" />
                <h5 className="font-black text-xs uppercase italic tracking-tighter">Parabéns! Curso Concluído!</h5>
                
                {/* O botão só aparece se a barra atingir 100% */}
                <button 
                  onClick={gerarCertificado}
                  className="mt-3 w-full py-3 bg-white text-orange-500 rounded-2xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all"
                >
                  Emitir Certificado Oficial
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