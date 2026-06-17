import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Database, Loader2, Image as ImageIcon, ShoppingCart,
  Users, PenTool, BarChart3, Trash2, TrendingUp, Target, Award, ArrowLeft,
  FileText, UploadCloud, X, Megaphone, Send, Bell, Sparkles,
  Edit3, Check, GripVertical, AlertTriangle, UserCheck, BookOpen,
  Activity, MessageSquare, Star, Bug, Smile, Eye, EyeOff, Trophy, Flag,
  Zap, RefreshCw, DollarSign, Percent, TrendingDown, Calendar, List, Eye as EyeIcon,
} from 'lucide-react';

const LS_METAS_KEY = 'verbo_admin_metas_celebradas';
const metaJaCelebrada = (c) => { try { return !!JSON.parse(localStorage.getItem(LS_METAS_KEY)||'{}')[c]; } catch { return false; } };
const marcarMetaCelebrada = (c) => { try { const s=JSON.parse(localStorage.getItem(LS_METAS_KEY)||'{}'); s[c]=true; localStorage.setItem(LS_METAS_KEY,JSON.stringify(s)); } catch {} };

// ── Componente TelaLeitura (importado do devocional.jsx) ──────────────────────
const TelaLeituraPreview = ({ devocional, onFechar, dark }) => {
  const [fontSize, setFontSize] = useState(16);
  const [tocandoAudio, setTocandoAudio] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (!tocandoAudio || !('speechSynthesis' in window)) return;
    const texto = `${devocional.titulo}. ${devocional.versiculo_chave || ''}. ${devocional.conteudo || ''}`;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => setTocandoAudio(false);
    return () => { window.speechSynthesis.cancel(); };
  }, [tocandoAudio, devocional]);

  const bg     = dark ? '#0d0d0f' : '#faf9f7';
  const bgCard = dark ? '#161618' : '#ffffff';
  const textMain = dark ? '#f1f5f9' : '#1a1a1a';
  const textSub  = dark ? '#cbd5e1' : '#6b7280';
  const acento   = '#5B2DFF';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: bg }}
      >
        <div
          className="flex-none flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}
        >
          <button onClick={onFechar} className="p-2 hover:bg-white/10 rounded-lg transition">
            <X size={20} style={{ color: textMain }} />
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase">PREVIEW</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFontSize(Math.max(14, fontSize - 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ZoomOut size={18} style={{ color: textMain }} />
            </button>
            <span className="text-xs px-2" style={{ color: textSub }}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(22, fontSize + 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ZoomIn size={18} style={{ color: textMain }} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-8 w-full"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} style={{ color: acento }} />
              <span className="text-xs font-medium" style={{ color: textSub }}>
                {new Date(devocional.data_publicacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              {devocional.destaque_dia && (
                <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,193,7,0.2)', color: '#FFC107' }}>
                  ✨ Destaque do Dia
                </span>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4 leading-tight" style={{ color: textMain }}>
            {devocional.titulo}
          </h1>

          {devocional.versiculo_chave && (
            <div
              className="mb-8 p-5 rounded-2xl border-l-4"
              style={{
                background: dark ? 'rgba(91,45,255,0.1)' : 'rgba(91,45,255,0.05)',
                borderColor: acento
              }}
            >
              <p className="text-lg font-semibold italic" style={{ color: acento }}>
                "{devocional.versiculo_chave}"
              </p>
            </div>
          )}

          <p
            className="leading-relaxed whitespace-pre-line mb-8"
            style={{
              color: textMain,
              fontSize: `${fontSize}px`,
              lineHeight: '1.8'
            }}
          >
            {devocional.conteudo}
          </p>

          {devocional.reflexao && (
            <div
              className="mb-8 p-6 rounded-2xl border-l-4"
              style={{
                background: dark ? 'rgba(236,64,122,0.08)' : 'rgba(236,64,122,0.06)',
                borderColor: '#EC407A'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} style={{ color: '#EC407A' }} />
                <span className="font-semibold" style={{ color: '#EC407A' }}>Para refletir</span>
              </div>
              <p
                className="leading-relaxed whitespace-pre-line"
                style={{
                  color: textMain,
                  fontSize: `${fontSize - 1}px`
                }}
              >
                {devocional.reflexao}
              </p>
            </div>
          )}

          <div style={{ height: 32 }} />
        </div>
      </div>
    </div>
  );
};

const CelebracaoMeta = ({ visivel, label, onFim }) => {
  const [pecas, setPecas] = useState([]);
  useEffect(() => {
    if (!visivel) return;
    const cores = ['#5B2DFF','#FFD700','#00C896','#FF3CAC','#fff','#a78bfa'];
    setPecas(Array.from({length:80},(_,i)=>({id:i,left:`${Math.random()*100}%`,width:`${Math.random()*10+4}px`,height:`${Math.random()*14+6}px`,background:cores[Math.floor(Math.random()*cores.length)],animationDelay:`${Math.random()*0.8}s`,animationDuration:`${Math.random()*1.5+1}s`,transform:`rotate(${Math.random()*360}deg)`})));
    const t=setTimeout(()=>{setPecas([]);onFim?.();},3500); return ()=>clearTimeout(t);
  },[visivel]);
  if (!visivel && pecas.length===0) return null;
  return (<><style>{`@keyframes meta-fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}80%{opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}.meta-piece{animation:meta-fall linear forwards}@keyframes meta-badge-in{0%{opacity:0;transform:translate(-50%,-50%) scale(0.5)}60%{transform:translate(-50%,-50%) scale(1.1)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}.meta-badge{animation:meta-badge-in 0.5s ease forwards}`}</style><div className="fixed inset-0 z-[500] pointer-events-none overflow-hidden">{pecas.map(p=><div key={p.id} className="absolute rounded-sm meta-piece" style={{left:p.left,top:'-20px',width:p.width,height:p.height,background:p.background,animationDelay:p.animationDelay,animationDuration:p.animationDuration,transform:p.transform}}/>)}<div className="fixed top-1/2 left-1/2 meta-badge pointer-events-none"><div className="bg-[#0f0b1e] border-2 border-purple-400 rounded-[32px] px-10 py-8 text-center shadow-2xl shadow-purple-500/30"><Trophy size={40} className="text-yellow-400 mx-auto mb-3"/><p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Meta Batida! 🎉</p><p className="text-2xl font-black text-white italic uppercase">{label}</p></div></div></div></>);
};

const ModalConfirmacao = ({ aberto, titulo, descricao, onConfirmar, onCancelar, loading }) => {
  if (!aberto) return null;
  return (<div className="fixed inset-0 z-[300] flex items-center justify-center p-6"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancelar}/><div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-red-100 animate-in zoom-in-95 duration-200"><div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 mx-auto"><AlertTriangle className="text-red-500" size={28}/></div><h3 className="font-black text-slate-900 text-center text-lg uppercase tracking-tighter italic mb-2">{titulo}</h3><p className="text-slate-400 text-xs text-center leading-relaxed mb-8">{descricao}</p><div className="flex gap-3"><button onClick={onCancelar} className="flex-1 py-4 rounded-2xl border border-slate-200 font-black text-xs uppercase text-slate-600 hover:bg-slate-50 transition-all">Cancelar</button><button onClick={onConfirmar} disabled={loading} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase hover:bg-red-600 transition-all flex items-center justify-center gap-2">{loading?<Loader2 className="animate-spin" size={14}/>:<><Trash2 size={14}/>Excluir</>}</button></div></div></div>);
};

const PreviewCapa = ({ url }) => {
  const [valida, setValida] = useState(false);
  const [tentando, setTentando] = useState(false);
  useEffect(() => { if (!url){setValida(false);return;} setTentando(true); const img=new Image(); img.onload=()=>{setValida(true);setTentando(false);}; img.onerror=()=>{setValida(false);setTentando(false);}; img.src=url; },[url]);
  if (!url) return null;
  return (<div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">{tentando?<Loader2 className="animate-spin text-slate-300" size={20}/>:valida?<img src={url} className="w-full h-full object-cover" alt="Preview"/>:<div className="flex flex-col items-center gap-1 text-slate-300"><ImageIcon size={24}/><span className="text-[9px] font-bold uppercase">URL inválida</span></div>}</div>);
};

const AulaItem = ({ aula, index, onDragStart, onDragOver, onDrop, onEditar, onDeletar, editando, onSalvarEdicao }) => {
  const [dadosEdicao, setDadosEdicao] = useState({titulo:aula.titulo,video_url:aula.video_url});
  return (<div draggable onDragStart={()=>onDragStart(index)} onDragOver={(e)=>{e.preventDefault();onDragOver(index);}} onDrop={()=>onDrop(index)} className={`bg-white p-4 rounded-[20px] border transition-all ${editando?'border-[#5B2DFF]/30 shadow-lg shadow-purple-50':'border-slate-100 hover:shadow-sm'}`}>{editando?(<div className="space-y-3"><input value={dadosEdicao.titulo} onChange={e=>setDadosEdicao(d=>({...d,titulo:e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-purple-200 outline-none" placeholder="Título da aula"/><input value={dadosEdicao.video_url} onChange={e=>setDadosEdicao(d=>({...d,video_url:e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-purple-200 outline-none" placeholder="URL do vídeo"/><div className="flex gap-2"><button onClick={()=>onSalvarEdicao(aula.id,dadosEdicao)} className="flex-1 py-2.5 bg-[#5B2DFF] text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5"><Check size={12}/>Salvar</button><button onClick={()=>onEditar(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl font-black text-[10px] uppercase text-slate-500">Cancelar</button></div></div>):(<div className="flex items-center gap-3"><div className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors"><GripVertical size={18}/></div><div className="w-7 h-7 bg-slate-100 rounded-xl flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-slate-400">{aula.ordem}</span></div><span className="flex-1 text-sm font-bold text-slate-700 truncate text-left">{aula.titulo}</span><div className="flex gap-1.5 shrink-0"><button onClick={()=>onEditar(aula.id)} className="p-2 bg-purple-50 text-[#5B2DFF] rounded-xl hover:bg-[#5B2DFF] hover:text-white transition-all"><Edit3 size={14}/></button><button onClick={()=>onDeletar(aula.id)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14}/></button></div></div>)}</div>);
};

const tipoConfig = {sugestao:{label:'Sugestão',icon:Star,cor:'yellow'},bug:{label:'Bug',icon:Bug,cor:'red'},elogio:{label:'Elogio',icon:Smile,cor:'green'},outro:{label:'Outro',icon:MessageSquare,cor:'blue'}};

const FeedbackCard = ({ fb, onMarcarLido, onDeletar }) => {
  const cfg=tipoConfig[fb.tipo]||tipoConfig.outro; const Icon=cfg.icon;
  const corMap={yellow:'bg-yellow-50 text-yellow-500',red:'bg-red-50 text-red-500',green:'bg-green-50 text-green-500',blue:'bg-blue-50 text-blue-500'};
  return (<div className={`bg-white p-5 rounded-[24px] border transition-all hover:shadow-sm ${fb.lido?'border-slate-100 opacity-60':'border-[#5B2DFF]/20 shadow-sm shadow-purple-50'}`}><div className="flex items-start justify-between gap-3 mb-3"><div className="flex items-center gap-3"><div className={`p-2.5 rounded-2xl shrink-0 ${corMap[cfg.cor]}`}><Icon size={16}/></div><div><p className="font-black text-slate-700 text-xs uppercase tracking-widest">{cfg.label}</p><p className="text-[10px] text-slate-400">{fb.email||'Usuário anônimo'}</p></div></div><div className="flex gap-0.5">{[1,2,3,4,5].map(n=><Star key={n} size={11} className={n<=fb.estrelas?'text-yellow-400 fill-yellow-400':'text-slate-200 fill-slate-100'}/>)}</div></div><p className="text-sm text-slate-600 leading-relaxed mb-3">{fb.mensagem}</p><div className="flex items-center justify-between"><span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{new Date(fb.criado_em).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span><div className="flex gap-2"><button onClick={()=>onMarcarLido(fb.id,!fb.lido)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all ${fb.lido?'bg-slate-100 text-slate-400 hover:bg-slate-200':'bg-purple-50 text-[#5B2DFF] hover:bg-purple-100'}`}>{fb.lido?<><EyeOff size={10}/>Reabrir</>:<><Eye size={10}/>Marcar lido</>}</button><button onClick={()=>onDeletar(fb.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"><Trash2 size={14}/></button></div></div></div>);
};

// ── Componente de Card de Devocional Atualizado com melhorias visuais ──────────
const DevocionalCard = ({ devocional, onEditar, onDeletar, onPreview, editando, onSalvarEdicao }) => {
  const [dadosEdicao, setDadosEdicao] = useState({
    titulo: devocional.titulo,
    versiculo_chave: devocional.versiculo_chave,
    conteudo: devocional.conteudo,
    reflexao: devocional.reflexao || '',
    tema: devocional.tema || 'geral',
    destaque_dia: devocional.destaque_dia || false,
    data_publicacao: devocional.data_publicacao?.split('T')[0] || new Date().toISOString().split('T')[0]
  });

  // ✅ Verificar se é recente (últimos 2 dias)
  const ehRecente = () => {
    const dias = Math.floor((Date.now() - new Date(devocional.data_publicacao)) / 86400000);
    return dias <= 2;
  };

  const temaConfig = {
    geral: { label: 'Geral', emoji: '📚', cor: 'bg-slate-100 text-slate-700' },
    perdão: { label: 'Perdão', emoji: '🕊️', cor: 'bg-blue-100 text-blue-700' },
    fé: { label: 'Fé', emoji: '✨', cor: 'bg-yellow-100 text-yellow-700' },
    liderança: { label: 'Liderança', emoji: '👑', cor: 'bg-purple-100 text-purple-700' },
    salmos: { label: 'Salmos', emoji: '🎵', cor: 'bg-pink-100 text-pink-700' },
    oração: { label: 'Oração', emoji: '🙏', cor: 'bg-green-100 text-green-700' },
  };

  const temaSelecionado = temaConfig[dadosEdicao.tema] || temaConfig.geral;

  return (
    <div className={`bg-white p-5 rounded-[24px] border transition-all ${editando ? 'border-[#5B2DFF]/30 shadow-lg shadow-purple-50' : 'border-slate-100 hover:shadow-sm'}`}>
      {editando ? (
        <div className="space-y-3">
          <input
            value={dadosEdicao.titulo}
            onChange={e => setDadosEdicao(d => ({ ...d, titulo: e.target.value }))}
            className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-purple-200 outline-none"
            placeholder="Título do devocional"
          />
          <input
            value={dadosEdicao.versiculo_chave}
            onChange={e => setDadosEdicao(d => ({ ...d, versiculo_chave: e.target.value }))}
            className="w-full p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-purple-200 outline-none"
            placeholder="Versículo-chave (ex: João 3:16)"
          />
          <textarea
            value={dadosEdicao.conteudo}
            onChange={e => setDadosEdicao(d => ({ ...d, conteudo: e.target.value }))}
            rows={5}
            className="w-full p-3 bg-slate-50 rounded-xl text-sm resize-none border-none focus:ring-2 focus:ring-purple-200 outline-none"
            placeholder="Conteúdo do devocional..."
          />
          <textarea
            value={dadosEdicao.reflexao}
            onChange={e => setDadosEdicao(d => ({ ...d, reflexao: e.target.value }))}
            rows={3}
            className="w-full p-3 bg-slate-50 rounded-xl text-sm resize-none border-none focus:ring-2 focus:ring-purple-200 outline-none"
            placeholder="Pergunta para reflexão (opcional)"
          />
          {/* ✅ Input de categoria customizável com datalist */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Categoria
            </label>
            <input 
              placeholder="Ex: Liderança, Fé, Salmos, Geral..." 
              className="w-full p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-purple-200 outline-none font-medium"
              value={dadosEdicao.tema}
              onChange={e => setDadosEdicao(d => ({ ...d, tema: e.target.value.toLowerCase().trim() }))}
              list="categorias-sugeridas"
            />
            <datalist id="categorias-sugeridas">
              <option value="geral"/>
              <option value="liderança"/>
              <option value="fé"/>
              <option value="salmos"/>
              <option value="perdão"/>
              <option value="oração"/>
            </datalist>
          </div>
          <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer border border-amber-100 hover:bg-amber-100 transition">
            <input 
              type="checkbox" 
              checked={dadosEdicao.destaque_dia}
              onChange={e => setDadosEdicao(d => ({ ...d, destaque_dia: e.target.checked }))}
              className="w-5 h-5 cursor-pointer"
            />
            <span className="text-[10px] font-black text-amber-700 uppercase">✨ Destaque do Dia</span>
          </label>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Data de Publicação
            </label>
            <input
              type="date"
              value={dadosEdicao.data_publicacao}
              onChange={e => setDadosEdicao(d => ({ ...d, data_publicacao: e.target.value }))}
              className="w-full p-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-purple-200 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSalvarEdicao(devocional.id, dadosEdicao)}
              className="flex-1 py-2.5 bg-[#5B2DFF] text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5"
            >
              <Check size={12} />Salvar
            </button>
            <button
              onClick={() => onEditar(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl font-black text-[10px] uppercase text-slate-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={12} className="text-purple-400" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  {new Date(devocional.data_publicacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                {devocional.destaque_dia && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">
                    ✨ Destaque
                  </span>
                )}
                {/* ✅ Badge "Novo" para devocionais dos últimos 2 dias */}
                {ehRecente() && (
                  <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                    🆕 Novo
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">{devocional.titulo}</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${temaConfig[devocional.tema?.toLowerCase() || 'geral']?.cor || temaConfig.geral.cor}`}>
                  {temaConfig[devocional.tema?.toLowerCase() || 'geral']?.emoji} {devocional.tema || 'Geral'}
                </span>
              </div>
              <p className="text-[11px] font-medium text-purple-600 mb-2">{devocional.versiculo_chave}</p>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{devocional.conteudo}</p>
              {devocional.reflexao && (
                <div className="mt-2 p-2 bg-purple-50 rounded-lg">
                  <p className="text-[10px] font-bold text-purple-700 flex items-center gap-1">
                    <BookOpen size={10} />
                    Para refletir:
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{devocional.reflexao}</p>
                </div>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onPreview(devocional)}
                aria-label="Visualizar preview do devocional"
                className="p-2 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                title="Visualizar preview"
              >
                <EyeIcon size={14} />
              </button>
              <button
                onClick={() => onEditar(devocional.id)}
                aria-label="Editar devocional"
                className="p-2 bg-purple-50 text-[#5B2DFF] rounded-xl hover:bg-[#5B2DFF] hover:text-white transition-all"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDeletar(devocional.id)}
                aria-label="Deletar devocional"
                className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Novos componentes de analytics ────────────────────────────────────────────

const FunilCard = ({ funil }) => {
  const etapas = [
    {label:'Visitantes',valor:funil.visitantes,cor:'bg-slate-400',emoji:'👀'},
    {label:'Cadastros',valor:funil.cadastros,cor:'bg-blue-400',emoji:'✍️'},
    {label:'1º Sermão',valor:funil.usaram,cor:'bg-purple-400',emoji:'📝'},
    {label:'Voltaram 2x+',valor:funil.voltaram,cor:'bg-violet-400',emoji:'🔁'},
    {label:'Assinantes',valor:funil.assinaram,cor:'bg-green-400',emoji:'💎'},
  ];
  const max = etapas[0].valor || 1;
  return (
    <div className="bg-white/5 border border-white/10 p-7 rounded-[32px] backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-500/20 rounded-2xl"><BarChart3 size={20} className="text-blue-400"/></div>
        <div><h3 className="font-black text-white text-sm uppercase tracking-tight">Funil do Usuário</h3><p className="text-[10px] text-slate-500 font-bold">Onde você perde usuários</p></div>
      </div>
      <div className="space-y-3">
        {etapas.map((etapa, i) => {
          const pct = max > 0 ? Math.round((etapa.valor/max)*100) : 0;
          const dropPct = i>0 && etapas[i-1].valor>0 ? Math.round((1-etapa.valor/etapas[i-1].valor)*100) : null;
          return (
            <div key={etapa.label}>
              {dropPct!==null && dropPct>0 && <div className="flex items-center gap-2 py-1 pl-2"><TrendingDown size={10} className="text-red-400"/><span className="text-[9px] font-black text-red-400">-{dropPct}% drop</span></div>}
              <div className="flex items-center gap-3">
                <span className="text-base w-6 shrink-0">{etapa.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{etapa.label}</span>
                    <span className="text-[10px] font-black text-white">{etapa.valor.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${etapa.cor} transition-all duration-1000`} style={{width:`${pct}%`,opacity:0.85}}/>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-500 w-8 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TaxasCard = ({ taxas }) => {
  const itens = [
    {label:'Visitante → Cadastro',valor:taxas.visitanteCadastro,cor:'text-blue-400',bg:'bg-blue-500/20',alerta:20},
    {label:'Cadastro → Uso',valor:taxas.cadastroUso,cor:'text-purple-400',bg:'bg-purple-500/20',alerta:40},
    {label:'Uso → Assinatura',valor:taxas.usoAssinatura,cor:'text-green-400',bg:'bg-green-500/20',alerta:15},
  ];
  return (
    <div className="bg-white/5 border border-white/10 p-7 rounded-[32px] backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-purple-500/20 rounded-2xl"><Percent size={20} className="text-purple-400"/></div>
        <div><h3 className="font-black text-white text-sm uppercase tracking-tight">Taxas de Conversão</h3><p className="text-[10px] text-slate-500 font-bold">Onde mexer pra crescer</p></div>
      </div>
      <div className="space-y-4">
        {itens.map(item => {
          const bom = item.valor >= item.alerta;
          return (
            <div key={item.label} className={`p-4 rounded-2xl ${item.bg} border border-white/5`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xl font-black ${item.cor}`}>{item.valor}%</span>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${bom?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400'}`}>{bom?'✓ OK':'↓ Baixo'}</span>
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.cor.replace('text-','bg-')} transition-all duration-1000`} style={{width:`${Math.min(item.valor*2,100)}%`}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AtivacaoCard = ({ ativacao }) => {
  const itens = [
    {label:'% com 1 sermão',valor:ativacao.pct1Sermao,emoji:'⚡',cor:'text-yellow-400',meta:50},
    {label:'% com 3+ sermões',valor:ativacao.pct3Sermoes,emoji:'🔥',cor:'text-orange-400',meta:25},
    {label:'% voltou em 7d',valor:ativacao.pct7Dias,emoji:'🔁',cor:'text-purple-400',meta:30},
  ];
  return (
    <div className="bg-white/5 border border-white/10 p-7 rounded-[32px] backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-yellow-500/20 rounded-2xl"><Zap size={20} className="text-yellow-400"/></div>
        <div><h3 className="font-black text-white text-sm uppercase tracking-tight">Ativação</h3><p className="text-[10px] text-slate-500 font-bold">O produto está grudando?</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {itens.map(item => (
          <div key={item.label} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <span className="text-2xl block mb-2">{item.emoji}</span>
            <p className={`text-2xl font-black ${item.cor}`}>{item.valor}%</p>
            <p className="text-[8px] font-black text-slate-500 uppercase mt-1 leading-tight">{item.label}</p>
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${item.cor.replace('text-','bg-')} transition-all duration-1000`} style={{width:`${Math.min(item.valor/item.meta*100,100)}%`}}/>
            </div>
            <p className="text-[7px] text-slate-600 mt-1">meta: {item.meta}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RetencaoCard = ({ retencao }) => {
  const ratio = retencao.wau>0 ? Math.round((retencao.dau/retencao.wau)*100) : 0;
  const qualidade = ratio>=20?{label:'Excelente',cor:'text-green-400'}:ratio>=10?{label:'Bom',cor:'text-yellow-400'}:{label:'Atenção',cor:'text-red-400'};
  return (
    <div className="bg-white/5 border border-white/10 p-7 rounded-[32px] backdrop-blur-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-green-500/20 rounded-2xl"><RefreshCw size={20} className="text-green-400"/></div>
        <div><h3 className="font-black text-white text-sm uppercase tracking-tight">Retenção</h3><p className="text-[10px] text-slate-500 font-bold">Vício no produto</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">DAU</p>
          <p className="text-3xl font-black text-white italic">{retencao.dau}</p>
          <p className="text-[8px] text-slate-600 mt-1">ativos hoje</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-5 text-center border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">WAU</p>
          <p className="text-3xl font-black text-white italic">{retencao.wau}</p>
          <p className="text-[8px] text-slate-600 mt-1">ativos esta semana</p>
        </div>
      </div>
      <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
        <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ratio DAU/WAU</p><p className="text-[8px] text-slate-600 mt-0.5">acima de 20% = produto viciante</p></div>
        <div className="text-right"><p className={`text-2xl font-black ${qualidade.cor}`}>{ratio}%</p><p className={`text-[9px] font-black ${qualidade.cor}`}>{qualidade.label}</p></div>
      </div>
    </div>
  );
};

const ReceitaCard = ({ receita }) => (
  <div className="bg-white/5 border border-white/10 p-7 rounded-[32px] backdrop-blur-md">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 bg-green-500/20 rounded-2xl"><DollarSign size={20} className="text-green-400"/></div>
      <div><h3 className="font-black text-white text-sm uppercase tracking-tight">Receita Inteligente</h3><p className="text-[10px] text-slate-500 font-bold">Além do MR mensal</p></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[
        {label:'MR Mensal',valor:receita.mr.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),cor:'text-green-400',bg:'bg-green-500/10',sub:'receita recorrente'},
        {label:'Ticket Médio',valor:receita.ticketMedio.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),cor:'text-blue-400',bg:'bg-blue-500/10',sub:'por assinante'},
        {label:'LTV Estimado',valor:receita.ltv.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),cor:'text-purple-400',bg:'bg-purple-500/10',sub:'12 meses × ticket'},
        {label:'Churn Estimado',valor:`${receita.churn}%`,cor:receita.churn>5?'text-red-400':'text-yellow-400',bg:receita.churn>5?'bg-red-500/10':'bg-yellow-500/10',sub:'cancelamento/mês'},
      ].map(item=>(
        <div key={item.label} className={`${item.bg} rounded-2xl p-4 border border-white/5`}>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{item.label}</p>
          <p className={`text-lg font-black ${item.cor} leading-tight`}>{item.valor}</p>
          <p className="text-[8px] text-slate-600 mt-1">{item.sub}</p>
        </div>
      ))}
    </div>
  </div>
);

// Import para icones faltantes
const ZoomIn = ({ size, style, className }) => <span className={className} style={style}>🔍</span>;
const ZoomOut = ({ size, style, className }) => <span className={className} style={style}>🔍</span>;

// ── Componente principal ──────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [aba, setAba] = useState('analytics');
  const [cursos, setCursos] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filtroFeedback, setFiltroFeedback] = useState('todos');
  const [mostrarLidos, setMostrarLidos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  
  // Estados para devocionais
  const [devocionais, setDevocionais] = useState([]);
  const [loadingDevocionais, setLoadingDevocionais] = useState(false);
  const [devocionalEditando, setDevocionalEditando] = useState(null);
  const [devocionalPreview, setDevocionalPreview] = useState(null);
  const [novoDevocional, setNovoDevocional] = useState({
    titulo: '',
    versiculo_chave: '',
    conteudo: '',
    reflexao: '',
    tema: 'geral',
    destaque_dia: false,
    data_publicacao: new Date().toISOString().split('T')[0]
  });
  
  const [stats, setStats] = useState({totalUsuarios:0,totalSermoes:0,totalAssinaturas:0,totalProgresso:0,taxaConclusao:0,mr:0,loadingStats:true});
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [dadosCrescimento, setDadosCrescimento] = useState([]);
  const [matriculasRecentes, setMatriculasRecentes] = useState([]);
  const [funil, setFunil] = useState({visitantes:0,cadastros:0,usaram:0,voltaram:0,assinaram:0});
  const [taxas, setTaxas] = useState({visitanteCadastro:0,cadastroUso:0,usoAssinatura:0});
  const [ativacao, setAtivacao] = useState({pct1Sermao:0,pct3Sermoes:0,pct7Dias:0});
  const [retencao, setRetencao] = useState({dau:0,wau:0});
  const [receita, setReceita] = useState({mr:0,ticketMedio:0,ltv:0,churn:0});
  const [metas, setMetas] = useState(()=>{try{const s=JSON.parse(localStorage.getItem('verbo_admin_metas')||'{}');return{usuarios:s.usuarios??50,sermoes:s.sermoes??100,assinaturas:s.assinaturas??50,sermoesDiarios:s.sermoesDiarios??14};}catch{return{usuarios:50,sermoes:100,assinaturas:50,sermoesDiarios:14};}});
  const [editandoMeta, setEditandoMeta] = useState(null);
  const [metaTemp, setMetaTemp] = useState('');
  const salvarMeta = (chave) => { const novo=parseInt(metaTemp,10); if(!isNaN(novo)&&novo>0){const nm={...metas,[chave]:novo};setMetas(nm);localStorage.setItem('verbo_admin_metas',JSON.stringify(nm));try{const s=JSON.parse(localStorage.getItem(LS_METAS_KEY)||'{}');delete s[chave];localStorage.setItem(LS_METAS_KEY,JSON.stringify(s));}catch{}} setEditandoMeta(null);setMetaTemp(''); };
  const [celebracao, setCelebracao] = useState({visivel:false,label:''});
  const verificarMetas = useCallback((novoStats,novasMetas)=>{const checks=[{chave:'usuarios',atual:novoStats.totalUsuarios,alvo:novasMetas.usuarios,label:'Meta de Usuários'},{chave:'sermoes',atual:novoStats.totalSermoes,alvo:novasMetas.sermoes,label:'Meta de Sermões'},{chave:'assinaturas',atual:novoStats.totalAssinaturas,alvo:novasMetas.assinaturas,label:'Meta de Assinaturas'}];for(const{chave,atual,alvo,label}of checks){if(atual>=alvo&&!metaJaCelebrada(chave)){marcarMetaCelebrada(chave);setCelebracao({visivel:true,label});return;}}},[]);
  const [novoCurso, setNovoCurso] = useState({titulo:'',descricao:'',capa_url:'',hotmart_id:'',checkout_url:''});
  const [novaAula, setNovaAula] = useState({titulo:'',video_url:'',material_url:'',curso_id:'',ordem:1});
  const [novaNotificacao, setNovaNotificacao] = useState({titulo:'',mensagem:'',tipo:'sistema',link:''});
  const [cursoEditando, setCursoEditando] = useState(null);
  const [dadosEdicaoCurso, setDadosEdicaoCurso] = useState({});
  const [aulasDoCurso, setAulasDoCurso] = useState([]);
  const [cursoSelecionadoAulas, setCursoSelecionadoAulas] = useState('');
  const [aulaEditando, setAulaEditando] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [modal, setModal] = useState({aberto:false,titulo:'',descricao:'',onConfirmar:null});
  const [modalLoading, setModalLoading] = useState(false);

  // ✅ NOVO: Carregamento inicial LEVE: apenas Analytics
  useEffect(() => {
    carregarAnalytics();
  }, []);

  // ✅ NOVO: Carregamento por aba: cada aba puxa seus próprios dados
  useEffect(() => {
    switch (aba) {
      case 'analytics':
        carregarAnalytics();
        carregarMatriculasRecentes(); // dados importantes para esta visão
        break;
      case 'cursos':
        carregarCursos();
        break;
      case 'aulas':
        // aulas são carregadas automaticamente via useEffect abaixo quando cursoSelecionadoAulas muda
        if (cursos.length === 0) carregarCursos();
        break;
      case 'comunicados':
        carregarNotificacoes();
        break;
      case 'feedbacks':
        carregarFeedbacks();
        break;
      case 'devocionais':
        carregarDevocionais();
        break;
      default:
        break;
    }
  }, [aba]);

  // ✅ NOVO: Carregamento específico quando curso é selecionado
  useEffect(() => {
    if (cursoSelecionadoAulas) carregarAulasDoCurso(cursoSelecionadoAulas);
  }, [cursoSelecionadoAulas]);

  // ════════════════════════════════════════════════════════════════════════════════
  // FUNÇÕES DE CARREGAMENTO INDIVIDUAIS
  // ════════════════════════════════════════════════════════════════════════════════

  const carregarNotificacoes = async () => {
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setNotificacoes(data);
  };

  const carregarMatriculasRecentes = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,email,plano,plano_atualizado_em,created_at')
      .in('plano', ['fundador', 'plus'])
      .order('plano_atualizado_em', { ascending: false })
      .limit(8);
    if (data) setMatriculasRecentes(data);
  };

  const carregarFeedbacks = async () => {
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('criado_em', { ascending: false });
    if (data) setFeedbacks(data);
  };

  // Funções para devocionais
  const carregarDevocionais = async () => {
    setLoadingDevocionais(true);
    const { data } = await supabase
      .from('devocionais')
      .select('*')
      .not('titulo', 'is', null)
      .order('data_publicacao', { ascending: false })
      .limit(50);
    if (data) setDevocionais(data);
    setLoadingDevocionais(false);
  };

  // ✅ FUNÇÃO CORRIGIDA - Salvar devocional com timezone correto
  const salvarDevocional = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Usuário não autenticado');
        setLoading(false);
        return;
      }

      // ✅ Ajustar para midnight da timezone local (sem o "Z")
      const [ano, mes, dia] = novoDevocional.data_publicacao.split('-');
      const dataMidnight = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      const dataISO = dataMidnight.toISOString();

      const dadosDevocional = {
        titulo: novoDevocional.titulo.trim(),
        versiculo_chave: novoDevocional.versiculo_chave.trim(),
        conteudo: novoDevocional.conteudo.trim(),
        reflexao: novoDevocional.reflexao.trim() || null,
        tema: novoDevocional.tema.toLowerCase().trim() || 'geral',
        destaque_dia: novoDevocional.destaque_dia || false,
        data_publicacao: dataISO,
        texto: novoDevocional.conteudo.trim(),
        user_id: user.id,
        data_criacao_dia: novoDevocional.data_publicacao,
        is_ia: false
      };

      const { error } = await supabase.from('devocionais').insert([dadosDevocional]);
      
      if (error) {
        console.error('Erro do Supabase:', error);
        alert(`Erro ao publicar: ${error.message}`);
        setLoading(false);
        return;
      }

      setNovoDevocional({
        titulo: '',
        versiculo_chave: '',
        conteudo: '',
        reflexao: '',
        tema: 'geral',
        destaque_dia: false,
        data_publicacao: new Date().toISOString().split('T')[0]
      });
      await carregarDevocionais();
      alert('Devocional publicado com sucesso! 🎉');
    } catch (err) {
      console.error('Erro ao salvar devocional:', err);
      alert('Erro inesperado ao publicar devocional');
    }
    
    setLoading(false);
  };

  const salvarEdicaoDevocional = async (id, dados) => {
    // ✅ Ajustar data de edição também
    const [ano, mes, dia] = dados.data_publicacao.split('-');
    const dataMidnight = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    const dataISO = dataMidnight.toISOString();

    await supabase.from('devocionais').update({
      titulo: dados.titulo.trim(),
      versiculo_chave: dados.versiculo_chave.trim(),
      conteudo: dados.conteudo.trim(),
      texto: dados.conteudo.trim(),
      reflexao: dados.reflexao.trim() || null,
      tema: dados.tema.toLowerCase().trim() || 'geral',
      destaque_dia: dados.destaque_dia || false,
      data_publicacao: dataISO,
      data_criacao_dia: dados.data_publicacao
    }).eq('id', id);
    setDevocionalEditando(null);
    carregarDevocionais();
  };

  const confirmarDeletarDevocional = (id) => {
    setModal({
      aberto: true,
      titulo: 'Excluir Devocional',
      descricao: 'Este devocional será removido permanentemente. O progresso dos usuários também será excluído.',
      onConfirmar: async () => {
        setModalLoading(true);
        await supabase.from('devocionais').delete().eq('id', id);
        setModal(m => ({ ...m, aberto: false }));
        setModalLoading(false);
        carregarDevocionais();
      }
    });
  };

  const carregarAnalytics = async () => {
    try {
      const hoje = new Date();
      const seteDiasAtras = new Date(hoje); seteDiasAtras.setDate(hoje.getDate()-7);

      const [
        {count:usuarios},{count:sermoes},{count:assinaturas},{count:progresso},
        {count:totalAulas},{count:totalFundadores},{count:totalPlus},
        {count:dau},{count:wau},
        vercelRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*',{count:'exact',head:true}),
        supabase.from('sermoes').select('*',{count:'exact',head:true}),
        supabase.from('profiles').select('*',{count:'exact',head:true}).in('plano',['fundador','plus']),
        supabase.from('progresso_aulas').select('*',{count:'exact',head:true}),
        supabase.from('aulas').select('*',{count:'exact',head:true}),
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('plano','fundador'),
        supabase.from('profiles').select('*',{count:'exact',head:true}).eq('plano','plus'),
        supabase.from('sessoes').select('*',{count:'exact',head:true}).gte('criado_em',`${hoje.toISOString().split('T')[0]}T00:00:00`),
        supabase.from('sessoes').select('*',{count:'exact',head:true}).gte('criado_em',seteDiasAtras.toISOString()),
        supabase.functions.invoke('vercel-analytics').catch(() => ({ data: null })),
      ]);

      const vercelData = vercelRes?.data;
      const totalVisitantesVercel = vercelData?.totalVisitantes || 0;

      const {data:todosSermoes} = await supabase.from('sermoes').select('user_id');
      const contagemPorUser = {};
      (todosSermoes||[]).forEach(s=>{contagemPorUser[s.user_id]=(contagemPorUser[s.user_id]||0)+1;});
      const com1Sermao  = Object.keys(contagemPorUser).length;
      const com3Sermoes = Object.values(contagemPorUser).filter(v=>v>=3).length;
      const voltaram2x  = Object.keys(contagemPorUser).filter(uid=>contagemPorUser[uid]>=2).length;

      const mr = ((totalFundadores||0)*9.90)+((totalPlus||0)*47);
      const taxaConclusao = assinaturas>0&&totalAulas>0?Math.round((progresso/(assinaturas*totalAulas))*100):0;
      const novoStats = {totalUsuarios:usuarios||0,totalSermoes:sermoes||0,totalAssinaturas:assinaturas||0,totalProgresso:progresso||0,taxaConclusao:Math.min(taxaConclusao,100),mr,loadingStats:false};
      setStats(novoStats);
      setMetas(m=>{verificarMetas(novoStats,m);return m;});

      const totalCadastros = usuarios||0;
      const totalUsaram    = com1Sermao;
      const totalVoltaram  = voltaram2x;
      const totalAssinaram = assinaturas||0;
      const totalVisitantes = totalVisitantesVercel > 0 ? totalVisitantesVercel : totalCadastros * 3;

      setFunil({visitantes:totalVisitantes,cadastros:totalCadastros,usaram:totalUsaram,voltaram:totalVoltaram,assinaram:totalAssinaram});
      setTaxas({
        visitanteCadastro:totalVisitantes>0?Math.round((totalCadastros/totalVisitantes)*100):0,
        cadastroUso:totalCadastros>0?Math.round((totalUsaram/totalCadastros)*100):0,
        usoAssinatura:totalUsaram>0?Math.round((totalAssinaram/totalUsaram)*100):0,
      });
      setAtivacao({
        pct1Sermao:totalCadastros>0?Math.round((com1Sermao/totalCadastros)*100):0,
        pct3Sermoes:totalCadastros>0?Math.round((com3Sermoes/totalCadastros)*100):0,
        pct7Dias:totalCadastros>0?Math.round((totalVoltaram/totalCadastros)*100):0,
      });
      setRetencao({dau:dau||0,wau:wau||0});
      const ticketMedio = totalAssinaram>0?mr/totalAssinaram:0;
      setReceita({mr,ticketMedio,ltv:ticketMedio*12,churn:0});

      const diasSemana=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      const [ultimos7,ultimos7U] = await Promise.all([
        Promise.all(Array.from({length:7},async(_,i)=>{const d=new Date();d.setDate(hoje.getDate()-(6-i));const dia=d.toISOString().split('T')[0];const{count}=await supabase.from('sermoes').select('*',{count:'exact',head:true}).gte('created_at',`${dia}T00:00:00`).lte('created_at',`${dia}T23:59:59`);return{label:diasSemana[d.getDay()],valor:count||0};})),
        Promise.all(Array.from({length:7},async(_,i)=>{const d=new Date();d.setDate(hoje.getDate()-(6-i));const dia=d.toISOString().split('T')[0];const{count}=await supabase.from('profiles').select('*',{count:'exact',head:true}).gte('created_at',`${dia}T00:00:00`).lte('created_at',`${dia}T23:59:59`);return{label:diasSemana[d.getDay()],valor:count||0};})),
      ]);
      setDadosGrafico(ultimos7); setDadosCrescimento(ultimos7U);
    } catch(err){console.error(err);}
  };

  const carregarCursos = async () => { setFetching(true); const{data}=await supabase.from('cursos').select('*').order('created_at',{ascending:false}); if(data)setCursos(data); setFetching(false); };
  const carregarAulasDoCurso = async (cursoId) => { const{data}=await supabase.from('aulas').select('*').eq('curso_id',cursoId).order('ordem',{ascending:true}); if(data)setAulasDoCurso(data); };
  const handleUploadPDF = async (e) => { const file=e.target.files[0]; if(!file||file.type!=='application/pdf'){alert("Envie apenas arquivos PDF.");return;} setUploadingPDF(true); try{const fileName=`${Math.random()}.pdf`;const{error}=await supabase.storage.from('materiais').upload(fileName,file);if(error)throw error;const{data}=supabase.storage.from('materiais').getPublicUrl(fileName);setNovaAula(a=>({...a,material_url:data.publicUrl}));}catch{alert("Erro ao subir arquivo.");}finally{setUploadingPDF(false);} };
  const salvarCurso = async (e) => { e.preventDefault();setLoading(true);const{error}=await supabase.from('cursos').insert([novoCurso]);if(!error){setNovoCurso({titulo:'',descricao:'',capa_url:'',hotmart_id:'',checkout_url:''});await carregarCursos();carregarAnalytics();}setLoading(false); };
  const iniciarEdicaoCurso = (curso) => { setCursoEditando(curso.id);setDadosEdicaoCurso({titulo:curso.titulo,descricao:curso.descricao,capa_url:curso.capa_url,hotmart_id:curso.hotmart_id,checkout_url:curso.checkout_url}); };
  const salvarEdicaoCurso = async (id) => { setLoading(true);const{error}=await supabase.from('cursos').update(dadosEdicaoCurso).eq('id',id);if(!error){setCursoEditando(null);await carregarCursos();}setLoading(false); };
  const confirmarDeletarCurso = (id) => { setModal({aberto:true,titulo:'Excluir Curso',descricao:'Isso removerá o curso, todas as aulas e matrículas associadas permanentemente.',onConfirmar:async()=>{setModalLoading(true);await supabase.from('cursos').delete().eq('id',id);setModal(m=>({...m,aberto:false}));setModalLoading(false);carregarCursos();}}); };
  const salvarAula = async (e) => { e.preventDefault();setLoading(true);const{error}=await supabase.from('aulas').insert([novaAula]);if(!error){setNovaAula(a=>({...a,titulo:'',video_url:'',material_url:'',ordem:Number(a.ordem)+1}));if(cursoSelecionadoAulas===novaAula.curso_id)carregarAulasDoCurso(novaAula.curso_id);carregarAnalytics();}setLoading(false); };
  const salvarEdicaoAula = async (id,dados) => { await supabase.from('aulas').update(dados).eq('id',id);setAulaEditando(null);carregarAulasDoCurso(cursoSelecionadoAulas); };
  const confirmarDeletarAula = (id) => { setModal({aberto:true,titulo:'Excluir Aula',descricao:'O progresso dos alunos nesta aula também será removido.',onConfirmar:async()=>{setModalLoading(true);await supabase.from('aulas').delete().eq('id',id);setModal(m=>({...m,aberto:false}));setModalLoading(false);carregarAulasDoCurso(cursoSelecionadoAulas);}}); };
  const handleDragStart = (index) => setDraggingIndex(index);
  const handleDragOver = (index) => { if(draggingIndex===null||draggingIndex===index)return;const novas=[...aulasDoCurso];const[item]=novas.splice(draggingIndex,1);novas.splice(index,0,item);setAulasDoCurso(novas);setDraggingIndex(index); };
  const handleDrop = async () => { setDraggingIndex(null);await Promise.all(aulasDoCurso.map((aula,i)=>supabase.from('aulas').update({ordem:i+1}).eq('id',aula.id)));carregarAulasDoCurso(cursoSelecionadoAulas); };
  const salvarNotificacao = async (e) => { e.preventDefault();setLoading(true);const{error}=await supabase.from('notificacoes').insert([novaNotificacao]);if(!error){setNovaNotificacao({titulo:'',mensagem:'',tipo:'sistema',link:''});carregarNotificacoes();}setLoading(false); };
  const confirmarDeletarNotificacao = (id) => { setModal({aberto:true,titulo:'Remover Comunicado',descricao:'Este comunicado será removido permanentemente.',onConfirmar:async()=>{setModalLoading(true);await supabase.from('notificacoes').delete().eq('id',id);setModal(m=>({...m,aberto:false}));setModalLoading(false);carregarNotificacoes();}}); };
  const marcarFeedbackLido = async (id,lido) => { await supabase.from('feedbacks').update({lido}).eq('id',id);setFeedbacks(prev=>prev.map(f=>f.id===id?{...f,lido}:f)); };
  const confirmarDeletarFeedback = (id) => { setModal({aberto:true,titulo:'Excluir Feedback',descricao:'Este feedback será removido permanentemente.',onConfirmar:async()=>{setModalLoading(true);await supabase.from('feedbacks').delete().eq('id',id);setModal(m=>({...m,aberto:false}));setModalLoading(false);setFeedbacks(prev=>prev.filter(f=>f.id!==id));}}); };

  const MetaBar = ({ atual, alvo, label, icon: Icon, color, chave }) => {
    const pct=Math.min((atual/alvo)*100,100); const estaEditando=editandoMeta===chave;
    return (<div className="space-y-2 mt-4"><div className="flex justify-between items-center"><div className="flex items-center gap-2 text-slate-400"><Icon size={12} className={color}/><span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div>{estaEditando?(<div className="flex items-center gap-1"><input type="number" value={metaTemp} onChange={e=>setMetaTemp(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')salvarMeta(chave);if(e.key==='Escape')setEditandoMeta(null);}} className="w-16 bg-white/10 text-white text-[10px] font-black rounded-lg px-2 py-1 border border-purple-400 outline-none text-right" autoFocus/><button onClick={()=>salvarMeta(chave)} className="p-1 bg-green-500 rounded-lg"><Check size={10} className="text-white"/></button><button onClick={()=>setEditandoMeta(null)} className="p-1 bg-white/10 rounded-lg"><X size={10} className="text-white"/></button></div>):(<button onClick={()=>{setEditandoMeta(chave);setMetaTemp(String(alvo));}} className="flex items-center gap-1 text-[10px] font-bold text-white/60 hover:text-white transition-colors">{atual}/{alvo}<Edit3 size={9} className="opacity-50"/></button>)}</div><div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10"><div className={`h-full transition-all duration-1000 ${color.replace('text-','bg-')}`} style={{width:`${pct}%`,boxShadow:`0 0 8px ${color==='text-purple-400'?'#a78bfa':'#4ade80'}`}}/></div></div>);
  };

  const maxGrafico=Math.max(...dadosGrafico.map(d=>d.valor),1);
  const maxCrescimento=Math.max(...dadosCrescimento.map(d=>d.valor),1);
  const inputClass="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold focus:ring-2 focus:ring-purple-200 outline-none transition-all";
  const feedbacksNaoLidos=feedbacks.filter(f=>!f.lido).length;
  const mediaEstrelas=feedbacks.length>0?(feedbacks.reduce((s,f)=>s+f.estrelas,0)/feedbacks.length).toFixed(1):'—';
  const feedbacksFiltrados=feedbacks.filter(f=>filtroFeedback==='todos'||f.tipo===filtroFeedback).filter(f=>mostrarLidos?true:!f.lido);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${aba==='analytics'?'bg-[#0f0b1e]':'bg-slate-50'} pb-[calc(6rem+env(safe-area-inset-bottom))]`}>
      <CelebracaoMeta visivel={celebracao.visivel} label={celebracao.label} onFim={()=>setCelebracao({visivel:false,label:''})}/>
      <ModalConfirmacao aberto={modal.aberto} titulo={modal.titulo} descricao={modal.descricao} onConfirmar={modal.onConfirmar} onCancelar={()=>setModal(m=>({...m,aberto:false}))} loading={modalLoading}/>

      {devocionalPreview && (
        <TelaLeituraPreview 
          devocional={devocionalPreview}
          onFechar={() => setDevocionalPreview(null)}
          dark={true}
        />
      )}

      {/* Header */}
      <div className={`${aba==='analytics'?'bg-[#16112c]/80 border-white/5 backdrop-blur-xl':'bg-white border-b border-slate-100'} p-5 shadow-sm sticky top-0 z-50`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/perfil')}className={`flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${aba==='analytics'?'border-white/10 text-white hover:bg-white/5':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><ArrowLeft size={14}/>Voltar</button>
            <div className="flex items-center gap-2"><div className={`p-2 rounded-xl ${aba==='analytics'?'bg-purple-500 text-white':'bg-[#5B2DFF] text-white'}`}><Database size={18}/></div><h1 className={`font-black text-lg uppercase italic hidden sm:block ${aba==='analytics'?'text-white':'text-slate-800'}`}>Gestão Verbo</h1></div>
          </div>
          <div className={`flex p-1 rounded-2xl gap-1 overflow-x-auto ${aba==='analytics'?'bg-white/5 border border-white/10':'bg-slate-100'}`}>
            {[{id:'analytics',label:'Analytics'},{id:'cursos',label:'Cursos'},{id:'aulas',label:'Aulas'},{id:'comunicados',label:'Avisos'},{id:'feedbacks',label:feedbacksNaoLidos>0?`Feedbacks (${feedbacksNaoLidos})`:'Feedbacks'},{id:'devocionais',label:'Devocionais'}].map(tab=>(
              <button key={tab.id} onClick={()=>setAba(tab.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${aba===tab.id?aba==='analytics'?'bg-purple-600 text-white':'bg-white text-[#5B2DFF] shadow-sm':tab.id==='feedbacks'&&feedbacksNaoLidos>0?'text-yellow-500 hover:text-yellow-600':'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* ════ ABA ANALYTICS ════ */}
        {aba==='analytics'&&(
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3"><TrendingUp className="text-purple-400" size={20}/><h2 className="text-white font-black uppercase tracking-tighter text-lg italic">Visão Estratégica</h2></div>

            {/* Cards principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[{icon:Users,color:'purple',label:'Total Usuários',value:stats.totalUsuarios,meta:{atual:stats.totalUsuarios,alvo:metas.usuarios,label:'Meta Usuários',icon:Target,color:'text-purple-400',chave:'usuarios'}},{icon:PenTool,color:'blue',label:'Sermões Gerados',value:stats.totalSermoes,meta:{atual:stats.totalSermoes,alvo:metas.sermoes,label:'Meta Sermões',icon:BarChart3,color:'text-blue-400',chave:'sermoes'}},{icon:Award,color:'green',label:'Assinaturas Ativas',value:stats.totalAssinaturas,meta:{atual:stats.totalAssinaturas,alvo:metas.assinaturas,label:'Meta Assinaturas',icon:ShoppingCart,color:'text-green-400',chave:'assinaturas'}}].map(({icon:Icon,color,label,value,meta})=>(
                <div key={label} className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                  <div className={`p-3 bg-${color}-500/20 text-${color}-400 rounded-2xl w-fit mb-4`}><Icon size={24}/></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                  <h3 className="text-4xl font-black text-white mt-1 italic">{value}</h3>
                  <MetaBar {...meta}/>
                </div>
              ))}
            </div>

            {/* Cards secundários */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-[24px]"><div className="flex items-center gap-2 mb-2"><Activity size={14} className="text-orange-400"/><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa Conclusão</span></div><p className="text-3xl font-black text-white italic">{stats.taxaConclusao}%</p><p className="text-[9px] text-slate-500 mt-1">aulas concluídas / esperadas</p></div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-[24px]"><div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-green-400"/><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receita Recorrente</span></div><p className="font-black text-white italic leading-tight" style={{fontSize:'clamp(1.1rem,5vw,1.875rem)'}}>{stats.mr.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p className="text-[9px] text-slate-500 mt-1">MR mensal estimado</p></div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-[24px] col-span-2 md:col-span-1"><div className="flex items-center gap-2 mb-2"><Star size={14} className="text-yellow-400"/><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota Média</span></div><p className="text-3xl font-black text-white italic">{mediaEstrelas}★</p><p className="text-[9px] text-slate-500 mt-1">{feedbacks.length} feedbacks recebidos</p></div>
            </div>

            {/* Funil + Taxas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FunilCard funil={funil}/>
              <TaxasCard taxas={taxas}/>
            </div>

            {/* Ativação + Retenção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AtivacaoCard ativacao={ativacao}/>
              <RetencaoCard retencao={retencao}/>
            </div>

            {/* Receita inteligente */}
            <ReceitaCard receita={receita}/>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-7 rounded-[32px]"><h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2"><PenTool size={16} className="text-purple-400"/>Sermões — 7 dias</h4><div className="h-36 flex items-end gap-2">{dadosGrafico.map((dia,i)=>(<div key={i} className="flex-1 flex flex-col items-center gap-1.5"><span className="text-[8px] text-purple-400 font-black">{dia.valor>0?dia.valor:''}</span><div className="w-full bg-purple-500/30 rounded-t-lg border-t border-purple-400 transition-all duration-700" style={{height:`${(dia.valor/maxGrafico)*100}%`,minHeight:dia.valor>0?'4px':'2px'}}/><span className="text-[9px] font-black text-slate-500 uppercase">{dia.label}</span></div>))}</div></div>
              <div className="bg-white/5 border border-white/10 p-7 rounded-[32px]"><h4 className="text-white font-bold text-sm mb-5 flex items-center gap-2"><TrendingUp size={16} className="text-green-400"/>Novos Usuários — 7 dias</h4><div className="h-36 flex items-end gap-2">{dadosCrescimento.map((sem,i)=>(<div key={i} className="flex-1 flex flex-col items-center gap-1.5"><span className="text-[8px] text-green-400 font-black">{sem.valor>0?sem.valor:''}</span><div className="w-full bg-green-500/30 rounded-t-lg border-t border-green-400 transition-all duration-700" style={{height:`${(sem.valor/maxCrescimento)*100}%`,minHeight:sem.valor>0?'4px':'2px'}}/><span className="text-[9px] font-black text-slate-500 uppercase">{sem.label}</span></div>))}</div></div>
            </div>

            {/* Assinantes recentes */}
            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden"><div className="p-6 border-b border-white/5 flex items-center justify-between"><h4 className="text-white font-bold text-sm flex items-center gap-2"><UserCheck size={16} className="text-orange-400"/>Assinantes Recentes</h4><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{matriculasRecentes.length} registros</span></div><div className="divide-y divide-white/5">{matriculasRecentes.length===0?<p className="p-6 text-center text-slate-500 text-xs">Nenhum assinante ainda.</p>:matriculasRecentes.map((m,i)=>(<div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-purple-500/20 rounded-2xl flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-purple-400">{(m.full_name||m.email||'?')[0].toUpperCase()}</span></div><div><p className="text-xs font-bold text-white">{m.full_name||m.email||'Usuário'}</p><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${m.plano==='plus'?'bg-purple-500/20 text-purple-400':'bg-amber-500/20 text-amber-400'}`}>{m.plano}</span></div></div><span className="text-[9px] font-black text-slate-500 uppercase">{new Date(m.plano_atualizado_em||m.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span></div>))}</div></div>
          </div>
        )}

        {/* ════ ABA CURSOS ════ */}
        {aba==='cursos'&&(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-1"><div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24"><h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2"><Plus size={18} className="text-[#5B2DFF]"/>Novo Curso</h2><form onSubmit={salvarCurso} className="space-y-3"><input placeholder="Título" className={inputClass} value={novoCurso.titulo} onChange={e=>setNovoCurso(c=>({...c,titulo:e.target.value}))} required/><textarea placeholder="Descrição" className={`${inputClass} min-h-[70px] resize-none`} value={novoCurso.descricao} onChange={e=>setNovoCurso(c=>({...c,descricao:e.target.value}))}/><div className="grid grid-cols-2 gap-3"><input placeholder="ID Hotmart" className={`${inputClass} text-[#5B2DFF] bg-purple-50`} value={novoCurso.hotmart_id} onChange={e=>setNovoCurso(c=>({...c,hotmart_id:e.target.value}))} required/><input placeholder="Checkout URL" className={`${inputClass} text-orange-600 bg-orange-50`} value={novoCurso.checkout_url} onChange={e=>setNovoCurso(c=>({...c,checkout_url:e.target.value}))} required/></div><div><input placeholder="URL da Capa" className={inputClass} value={novoCurso.capa_url} onChange={e=>setNovoCurso(c=>({...c,capa_url:e.target.value}))}/><PreviewCapa url={novoCurso.capa_url}/></div><button disabled={loading} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-[#4a22e0] transition-all">{loading?<Loader2 className="animate-spin" size={16}/>:<><Plus size={14}/>Cadastrar Curso</>}</button></form></div></div>
            <div className="md:col-span-2 space-y-4"><div className="flex items-center justify-between px-2"><h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Cursos ({cursos.length})</h2>{fetching&&<Loader2 className="animate-spin text-slate-300" size={16}/>}</div>{cursos.map(curso=>(<div key={curso.id} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden transition-all hover:shadow-md">{cursoEditando===curso.id?(<div className="p-6 space-y-3"><input value={dadosEdicaoCurso.titulo} onChange={e=>setDadosEdicaoCurso(d=>({...d,titulo:e.target.value}))} className={inputClass} placeholder="Título"/><textarea value={dadosEdicaoCurso.descricao} onChange={e=>setDadosEdicaoCurso(d=>({...d,descricao:e.target.value}))} className={`${inputClass} min-h-[60px] resize-none`} placeholder="Descrição"/><div className="grid grid-cols-2 gap-3"><input value={dadosEdicaoCurso.hotmart_id} onChange={e=>setDadosEdicaoCurso(d=>({...d,hotmart_id:e.target.value}))} className={`${inputClass} text-[#5B2DFF] bg-purple-50`} placeholder="ID Hotmart"/><input value={dadosEdicaoCurso.checkout_url} onChange={e=>setDadosEdicaoCurso(d=>({...d,checkout_url:e.target.value}))} className={`${inputClass} text-orange-600 bg-orange-50`} placeholder="Checkout URL"/></div><div><input value={dadosEdicaoCurso.capa_url} onChange={e=>setDadosEdicaoCurso(d=>({...d,capa_url:e.target.value}))} className={inputClass} placeholder="URL da Capa"/><PreviewCapa url={dadosEdicaoCurso.capa_url}/></div><div className="flex gap-2 pt-1"><button onClick={()=>salvarEdicaoCurso(curso.id)} disabled={loading} className="flex-1 py-3 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5">{loading?<Loader2 className="animate-spin" size={14}/>:<><Check size={14}/>Salvar</>}</button><button onClick={()=>setCursoEditando(null)} className="px-5 py-3 border border-slate-200 rounded-2xl font-black text-xs uppercase text-slate-500">Cancelar</button></div></div>):(<div className="p-5 flex items-center justify-between gap-4"><div className="flex items-center gap-4 min-w-0"><div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-50">{curso.capa_url?<img src={curso.capa_url} className="w-full h-full object-cover" alt=""/>:<div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300" size={22}/></div>}</div><div className="min-w-0 text-left"><h3 className="font-bold text-slate-800 text-sm truncate">{curso.titulo}</h3><span className="text-[9px] bg-purple-50 text-[#5B2DFF] px-2 py-0.5 rounded-full font-black uppercase">ID: {curso.hotmart_id}</span></div></div><div className="flex gap-2 shrink-0"><button onClick={()=>{setAba('aulas');setNovaAula(a=>({...a,curso_id:curso.id}));setCursoSelecionadoAulas(curso.id);}} className="p-2.5 bg-purple-50 text-[#5B2DFF] rounded-xl hover:bg-[#5B2DFF] hover:text-white transition-all"><Plus size={16}/></button><button onClick={()=>iniciarEdicaoCurso(curso)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={16}/></button><button onClick={()=>confirmarDeletarCurso(curso.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button></div></div>)}</div>))}</div>
          </div>
        )}

        {/* ════ ABA AULAS ════ */}
        {aba==='aulas'&&(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-1"><div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24"><h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2"><Plus size={18} className="text-[#5B2DFF]"/>Nova Aula</h2><form onSubmit={salvarAula} className="space-y-3"><select className={inputClass} value={novaAula.curso_id} onChange={e=>{setNovaAula(a=>({...a,curso_id:e.target.value}));setCursoSelecionadoAulas(e.target.value);}} required><option value="">Selecione um curso...</option>{cursos.map(c=><option key={c.id} value={c.id}>{c.titulo}</option>)}</select><input placeholder="Título da Aula" className={inputClass} value={novaAula.titulo} onChange={e=>setNovaAula(a=>({...a,titulo:e.target.value}))} required/><input placeholder="Link do Vídeo (YouTube)" className={inputClass} value={novaAula.video_url} onChange={e=>setNovaAula(a=>({...a,video_url:e.target.value}))} required/><input type="number" placeholder="Ordem" className={inputClass} value={novaAula.ordem} onChange={e=>setNovaAula(a=>({...a,ordem:Number(e.target.value)}))} min={1}/>{!novaAula.material_url?(<div className="relative group"><input type="file" accept=".pdf" onChange={handleUploadPDF} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploadingPDF}/><div className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${uploadingPDF?'bg-slate-50 border-slate-200':'bg-orange-50/30 border-orange-200 group-hover:bg-orange-50'}`}>{uploadingPDF?<><Loader2 className="animate-spin text-orange-500 mb-1" size={18}/><span className="text-[10px] font-black text-orange-500 uppercase">Subindo...</span></>:<><UploadCloud className="text-orange-400 mb-1" size={22}/><span className="text-[10px] font-black text-orange-600 uppercase">Anexar Apostila PDF</span></>}</div></div>):(<div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100"><div className="flex items-center gap-3"><FileText className="text-green-500 shrink-0" size={16}/><span className="text-[10px] font-bold text-green-700">Apostila anexada ✓</span></div><button type="button" onClick={()=>setNovaAula(a=>({...a,material_url:''}))} className="p-1 text-green-600 hover:text-red-500"><X size={14}/></button></div>)}<button disabled={loading||uploadingPDF} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-[#4a22e0] transition-all">{loading?<Loader2 className="animate-spin" size={16}/>:'Publicar Aula'}</button></form></div></div>
            <div className="md:col-span-2 space-y-4"><div className="flex items-center justify-between px-2"><h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">{cursoSelecionadoAulas?`${aulasDoCurso.length} aulas`:'Selecione um curso'}</h2>{cursoSelecionadoAulas&&<span className="text-[9px] text-slate-300 font-bold flex items-center gap-1"><GripVertical size={10}/>Arraste para reordenar</span>}</div>{!cursoSelecionadoAulas?(<div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center"><BookOpen size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm font-bold">Selecione um curso no formulário ao lado.</p></div>):aulasDoCurso.length===0?(<div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center"><p className="text-slate-400 text-sm font-bold">Nenhuma aula neste curso ainda.</p></div>):(<div className="space-y-2">{aulasDoCurso.map((aula,index)=>(<AulaItem key={aula.id} aula={aula} index={index} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onEditar={setAulaEditando} onDeletar={confirmarDeletarAula} editando={aulaEditando===aula.id} onSalvarEdicao={salvarEdicaoAula}/>))}</div>)}</div>
          </div>
        )}

        {/* ════ ABA COMUNICADOS ════ */}
        {aba==='comunicados'&&(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-1"><div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24"><h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2"><Megaphone size={18} className="text-orange-500"/>Novo Aviso</h2><form onSubmit={salvarNotificacao} className="space-y-3"><select className={inputClass} value={novaNotificacao.tipo} onChange={e=>setNovaNotificacao(n=>({...n,tipo:e.target.value}))}><option value="sistema">⚙️ Atualização do App</option><option value="aula">📚 Nova Aula/Curso</option><option value="promocao">🔥 Promoção</option></select><input placeholder="Título" className={inputClass} value={novaNotificacao.titulo} onChange={e=>setNovaNotificacao(n=>({...n,titulo:e.target.value}))} required/><textarea placeholder="Mensagem..." className={`${inputClass} min-h-[100px] resize-none`} value={novaNotificacao.mensagem} onChange={e=>setNovaNotificacao(n=>({...n,mensagem:e.target.value}))} required/><input placeholder="Link (opcional)" className={`${inputClass} text-blue-500`} value={novaNotificacao.link} onChange={e=>setNovaNotificacao(n=>({...n,link:e.target.value}))}/><button disabled={loading} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all">{loading?<Loader2 className="animate-spin" size={16}/>:<><Send size={14}/>Enviar Agora</>}</button></form></div></div>
            <div className="md:col-span-2 space-y-4"><h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest px-2">Histórico de Avisos</h2>{notificacoes.length===0&&<div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center"><p className="text-slate-400 text-sm font-bold">Nenhum comunicado enviado ainda.</p></div>}{notificacoes.map(n=>(<div key={n.id} className="bg-white p-6 rounded-[28px] border border-slate-100 flex items-start justify-between group hover:shadow-sm transition-all"><div className="flex gap-4"><div className={`p-3 rounded-2xl shrink-0 ${n.tipo==='promocao'?'bg-orange-50 text-orange-500':n.tipo==='aula'?'bg-purple-50 text-[#5B2DFF]':'bg-blue-50 text-blue-500'}`}>{n.tipo==='promocao'?<Sparkles size={18}/>:n.tipo==='aula'?<Bell size={18}/>:<Megaphone size={18}/>}</div><div className="text-left"><h3 className="font-black text-slate-800 text-sm uppercase italic tracking-tighter">{n.titulo}</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{n.mensagem}</p><span className="text-[9px] font-bold text-slate-300 mt-2 block uppercase">{new Date(n.created_at).toLocaleDateString('pt-BR')}</span></div></div><button onClick={()=>confirmarDeletarNotificacao(n.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors shrink-0"><Trash2 size={16}/></button></div>))}</div>
          </div>
        )}

        {/* ════ ABA FEEDBACKS ════ */}
        {aba==='feedbacks'&&(
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{label:'Total',value:feedbacks.length,cor:'bg-slate-100 text-slate-600'},{label:'Não lidos',value:feedbacksNaoLidos,cor:'bg-yellow-50 text-yellow-600'},{label:'Nota média',value:`${mediaEstrelas}★`,cor:'bg-green-50 text-green-600'},{label:'Bugs',value:feedbacks.filter(f=>f.tipo==='bug').length,cor:'bg-red-50 text-red-500'}].map(({label,value,cor})=>(<div key={label} className={`${cor} rounded-[20px] p-4 text-center`}><p className="text-2xl font-black">{value}</p><p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p></div>))}</div>
            <div className="flex flex-wrap items-center gap-3"><div className="flex gap-2 flex-wrap">{['todos','sugestao','bug','elogio','outro'].map(tipo=>(<button key={tipo} onClick={()=>setFiltroFeedback(tipo)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtroFeedback===tipo?'bg-[#5B2DFF] text-white':'bg-white border border-slate-200 text-slate-500 hover:border-[#5B2DFF] hover:text-[#5B2DFF]'}`}>{tipo==='todos'?'Todos':tipoConfig[tipo]?.label}</button>))}</div><button onClick={()=>setMostrarLidos(v=>!v)} className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${mostrarLidos?'bg-slate-800 text-white border-slate-800':'bg-white border-slate-200 text-slate-500'}`}>{mostrarLidos?<><EyeOff size={12}/>Ocultar lidos</>:<><Eye size={12}/>Mostrar lidos</>}</button></div>
            {feedbacksFiltrados.length===0?(<div className="bg-white rounded-[28px] border border-slate-100 p-16 text-center"><MessageSquare size={36} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm font-bold">{feedbacks.length===0?'Nenhum feedback recebido ainda.':'Nenhum feedback neste filtro.'}</p></div>):(<div className="space-y-3">{feedbacksFiltrados.map(fb=><FeedbackCard key={fb.id} fb={fb} onMarcarLido={marcarFeedbackLido} onDeletar={confirmarDeletarFeedback}/>)}</div>)}
          </div>
        )}

        {/* ════ ABA DEVOCIONAIS ════ */}
        {aba==='devocionais'&&(
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24">
                <h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2">
                  <Plus size={18} className="text-[#5B2DFF]"/>Novo Devocional
                </h2>
                <form onSubmit={salvarDevocional} className="space-y-3">
                  <input 
                    placeholder="Título do devocional" 
                    className={inputClass} 
                    value={novoDevocional.titulo} 
                    onChange={e=>setNovoDevocional(d=>({...d,titulo:e.target.value}))} 
                    required
                  />
                  <input 
                    placeholder="Versículo-chave (ex: João 3:16)" 
                    className={inputClass} 
                    value={novoDevocional.versiculo_chave} 
                    onChange={e=>setNovoDevocional(d=>({...d,versiculo_chave:e.target.value}))} 
                    required
                  />
                  <textarea 
                    placeholder="Conteúdo do devocional..." 
                    className={`${inputClass} min-h-[140px] resize-none`} 
                    value={novoDevocional.conteudo} 
                    onChange={e=>setNovoDevocional(d=>({...d,conteudo:e.target.value}))}
                    required
                  />
                  <textarea 
                    placeholder="Pergunta para reflexão (opcional)" 
                    className={`${inputClass} min-h-[80px] resize-none`} 
                    value={novoDevocional.reflexao} 
                    onChange={e=>setNovoDevocional(d=>({...d,reflexao:e.target.value}))}
                  />
                  {/* ✅ Input de categoria customizável com datalist */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Categoria
                    </label>
                    <input 
                      placeholder="Ex: Liderança, Fé, Salmos, Geral..." 
                      className={inputClass}
                      value={novoDevocional.tema}
                      onChange={e => setNovoDevocional(d => ({ ...d, tema: e.target.value.toLowerCase().trim() }))}
                      list="categorias-sugeridas"
                    />
                    <datalist id="categorias-sugeridas">
                      <option value="geral"/>
                      <option value="liderança"/>
                      <option value="fé"/>
                      <option value="salmos"/>
                      <option value="perdão"/>
                      <option value="oração"/>
                    </datalist>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer border border-amber-100 hover:bg-amber-100 transition">
                    <input 
                      type="checkbox" 
                      checked={novoDevocional.destaque_dia}
                      onChange={e=>setNovoDevocional(d=>({...d,destaque_dia:e.target.checked}))}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="text-[10px] font-black text-amber-700 uppercase">✨ Destaque do Dia</span>
                  </label>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      Data de Publicação
                    </label>
                    <input 
                      type="date"
                      className={inputClass}
                      value={novoDevocional.data_publicacao}
                      onChange={e=>setNovoDevocional(d=>({...d,data_publicacao:e.target.value}))}
                      required
                    />
                  </div>
                  <button 
                    disabled={loading} 
                    className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-[#4a22e0] transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <><Plus size={14}/>Publicar Devocional</>}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                  Devocionais ({devocionais.length})
                </h2>
                {loadingDevocionais && <Loader2 className="animate-spin text-slate-300" size={16}/>}
              </div>
              
              {devocionais.length === 0 ? (
                <div className="bg-white rounded-[28px] border border-slate-100 p-12 text-center">
                  <BookOpen size={32} className="text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-400 text-sm font-bold">Nenhum devocional publicado ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {devocionais.map(devocional => (
                    <DevocionalCard
                      key={devocional.id}
                      devocional={devocional}
                      onEditar={setDevocionalEditando}
                      onDeletar={confirmarDeletarDevocional}
                      onPreview={setDevocionalPreview}
                      editando={devocionalEditando === devocional.id}
                      onSalvarEdicao={salvarEdicaoDevocional}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;