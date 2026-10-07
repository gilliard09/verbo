import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePlano } from '../hooks/usePlano';
import {
  User, LogOut, Camera, Phone,
  CheckCircle2, Loader2, Save, KeyRound,
  ChevronRight, Instagram, Info, Share2, X,
  Download, Sparkles, ShieldCheck, Globe, Heart,
  MessageSquare, Star, Bug, Smile,
  LayoutDashboard, Mail, Lock, Eye, EyeOff,
  PenTool, BookOpen, TrendingUp, Award, AlertTriangle,
  Crown, Zap, Book, ZoomIn, ZoomOut, Check, GraduationCap
} from 'lucide-react';

const AVATAR_MAX_MB = 8;
const AVATAR_MAX_BYTES = AVATAR_MAX_MB * 1024 * 1024;

// ─── Modal de crop de avatar ──────────────────────────────────────────────────
const ModalCropAvatar = ({ imagemSrc, onConfirmar, onCancelar, uploading }) => {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(new window.Image());
  const [imgPronta, setImgPronta] = useState(false);

  const SIZE = 280; // tamanho do canvas

  useEffect(() => {
    const img = imgRef.current;
    img.onload = () => { setImgPronta(true); setOffset({ x: 0, y: 0 }); setZoom(1); };
    img.src = imagemSrc;
  }, [imagemSrc]);

  const desenhar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgPronta) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    // Escala base para cobrir o canvas
    const escala = Math.max(SIZE / img.width, SIZE / img.height) * zoom;
    const w = img.width * escala;
    const h = img.height * escala;
    const x = (SIZE - w) / 2 + offset.x;
    const y = (SIZE - h) / 2 + offset.y;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Máscara circular
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    // Borda roxa
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#4C1D95';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imgPronta, zoom, offset]);

  useEffect(() => { desenhar(); }, [desenhar]);

  // Drag para reposicionar — usamos listeners no `document` para o arraste
  // continuar funcionando mesmo se o cursor sair da área do canvas antes
  // de soltar o clique (comportamento padrão em editores de crop).
  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // Touch para reposicionar
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
  };
  const onTouchEnd = () => setDragging(false);

  const confirmar = () => {
    const canvas = canvasRef.current;
    canvas.toBlob(blob => onConfirmar(blob), 'image/jpeg', 0.92);
  };

  if (!imagemSrc) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="font-black text-slate-800 text-center uppercase tracking-tight mb-1">Ajustar Foto</h3>
        <p className="text-slate-400 text-xs text-center mb-5">Arraste para reposicionar • Use o zoom para ajustar</p>

        {/* Canvas de crop */}
        <div className="flex justify-center mb-5">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            style={{ width: SIZE, height: SIZE, cursor: dragging ? 'grabbing' : 'grab', borderRadius: '50%', touchAction: 'none' }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
        </div>

        {/* Slider de zoom */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <ZoomOut size={16} className="text-slate-400 shrink-0" />
          <input
            type="range" min={1} max={3} step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#4C1D95]"
            aria-label="Zoom da foto"
          />
          <ZoomIn size={16} className="text-slate-400 shrink-0" />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancelar}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-sm text-slate-500">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={uploading}
            className="flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: '#4C1D95' }}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Usar foto</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de confirmação de logout ──────────────────────────────────────────
const ModalLogout = ({ aberto, onConfirmar, onCancelar, loading }) => {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-red-50 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <LogOut className="text-red-500" size={26} />
        </div>
        <h3 className="font-black text-slate-900 text-center text-lg uppercase tracking-tighter italic mb-2">Encerrar Sessão?</h3>
        <p className="text-slate-400 text-xs text-center leading-relaxed mb-8">Você será desconectado do Verbo. Pode entrar novamente a qualquer momento.</p>
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-xs uppercase text-slate-600 hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={loading} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold text-xs uppercase hover:bg-red-600 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <><LogOut size={14} /> Sair</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card de estatística ──────────────────────────────────────────────────────
// Conteúdo centralizado (ícone, número e label) para não parecer desalinhado
// dentro do card — antes cada elemento "flutuava" à esquerda em larguras
// diferentes, o que dava uma sensação de layout mal ajustado.
const StatCard = ({ icon: Icon, color, label, value, sub }) => (
  <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center text-center gap-2">
    <div className={`p-2.5 rounded-xl ${color}`}>
      <Icon size={18} />
    </div>
    <p className="text-3xl font-black text-slate-800 italic leading-none">{value}</p>
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[9px] text-slate-300 font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Skeleton dos cards de estatística (enquanto carrega) ─────────────────────
const StatCardSkeleton = () => (
  <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col items-center gap-2 animate-pulse">
    <div className="w-9 h-9 rounded-xl bg-slate-100" />
    <div className="w-8 h-6 rounded bg-slate-100" />
    <div className="w-14 h-2.5 rounded bg-slate-100" />
  </div>
);

// ─── Badge do plano ───────────────────────────────────────────────────────────
const BadgePlano = ({ plano }) => {
  if (plano === 'plus') return (
    <span className="inline-flex items-center gap-1 bg-[#4C1D95] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
      <Zap size={9} /> Plus
    </span>
  );
  if (plano === 'fundador') return (
    <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
      <Crown size={9} /> Fundador
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
      Gratuito
    </span>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const Perfil = ({ onOpenBiblia }) => {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { plano, isFundador, isPlus, isAssinante } = usePlano();

  // Navegação por querystring (?view=dados) em vez de estado puro — assim o
  // botão/gesto de voltar do celular volta para o menu do Perfil em vez de
  // sair da página inteira.
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'menu';
  const setView = useCallback((novaView) => {
    if (novaView === 'menu') setSearchParams({}, { replace: false });
    else setSearchParams({ view: novaView });
  }, [setSearchParams]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [boletim, setBoletim] = useState({ cursos: [], loading: false, erro: '' });
  const [success, setSuccess] = useState(false);
  const [erro, setErro] = useState('');
  const [modalLogout, setModalLogout] = useState(false);

  // Crop
  const [imagemCropSrc, setImagemCropSrc] = useState(null);

  const [perfil, setPerfil] = useState({
    nome: '', email: '', telefone: '', avatar_url: '', role: 'user'
  });

  // Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [querTrocarSenha, setQuerTrocarSenha] = useState(false);

  // Estatísticas
  const [stats, setStats] = useState({
    sermoes: 0, aulasCompletas: 0, certificados: 0, loading: true, erro: false
  });

  const [textoCard, setTextoCard] = useState("Escaneie e organize seus sermões agora mesmo!");
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  useEffect(() => { getProfile(); }, []);

  useEffect(() => {
    if (view === 'boletim') carregarBoletim();
  }, [view]);

  const carregarBoletim = async () => {
    if (!isAssinante) return;
    setBoletim({ cursos: [], loading: true, erro: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [
        { data: matriculas, error: matriculasError },
        { data: progresso, error: progressoError },
        { data: cursos },
        { data: materias },
        { data: aulas },
        { data: avaliacoes },
        { data: tentativas },
      ] = await Promise.all([
        supabase.from('matriculas').select('curso_id,status,concluido_em,certificado_emitido').eq('user_id', user.id),
        supabase.from('progresso_aulas').select('aula_id,concluida_em').eq('user_id', user.id),
        supabase.from('cursos').select('id,titulo,descricao,capa_url'),
        supabase.from('materias').select('id,curso_id,titulo,ordem').order('ordem', { ascending: true }),
        supabase.from('aulas').select('id,curso_id,materia_id,ordem'),
        supabase.from('avaliacoes').select('id,materia_id,titulo,nota_minima'),
        supabase.from('tentativas_avaliacao').select('avaliacao_id,nota,aprovado,acertos,total_questoes,concluida_em').eq('user_id', user.id).order('concluida_em', { ascending: false }),
      ]);
      if (matriculasError || progressoError) throw matriculasError || progressoError;

      const matriculaMap = Object.fromEntries((matriculas || []).map(m => [m.curso_id, m]));
      const concluidaMap = Object.fromEntries((progresso || []).filter(p => p.concluida_em).map(p => [p.aula_id, true]));
      const avaliacaoMap = Object.fromEntries((avaliacoes || []).map(a => [a.id, a]));
      const tentativasPorAvaliacao = {};
      (tentativas || []).forEach(t => (tentativasPorAvaliacao[t.avaliacao_id] ||= []).push(t));

      const cursosComAtividade = new Set([
        ...(matriculas || []).map(m => m.curso_id),
        ...(progresso || []).map(p => aulas?.find(a => a.id === p.aula_id)?.curso_id).filter(Boolean),
      ]);

      const resultado = (cursos || []).filter(c => cursosComAtividade.has(c.id)).map(curso => {
        const materiasCurso = (materias || []).filter(m => m.curso_id === curso.id).map(materia => {
          const aulasMateria = (aulas || []).filter(a => a.materia_id === materia.id);
          const concluidas = aulasMateria.filter(a => concluidaMap[a.id]).length;
          const avaliacao = (avaliacoes || []).find(a => a.materia_id === materia.id);
          const tentativasMateria = avaliacao ? (tentativasPorAvaliacao[avaliacao.id] || []) : [];
          const melhorTentativa = tentativasMateria.length ? tentativasMateria.reduce((best, t) => Number(t.nota) > Number(best.nota) ? t : best, tentativasMateria[0]) : null;
          const materiaConcluida = aulasMateria.length > 0 && concluidas === aulasMateria.length;
          return { ...materia, totalAulas: aulasMateria.length, concluidas, progresso: aulasMateria.length ? Math.round((concluidas / aulasMateria.length) * 100) : 0, concluida: materiaConcluida, avaliacao: avaliacao ? { ...avaliacao, nota: melhorTentativa?.nota ?? null, aprovado: melhorTentativa?.aprovado ?? false, tentativas: tentativasMateria.length } : null };
        });
        const aulasCurso = (aulas || []).filter(a => a.curso_id === curso.id);
        const aulasConcluidas = aulasCurso.filter(a => concluidaMap[a.id]).length;
        const matricula = matriculaMap[curso.id];
        const cursoConcluido = !!matricula?.concluido_em || (aulasCurso.length > 0 && aulasConcluidas === aulasCurso.length);
        return { ...curso, materias: materiasCurso, aulasConcluidas, totalAulas: aulasCurso.length, progresso: aulasCurso.length ? Math.round((aulasConcluidas / aulasCurso.length) * 100) : 0, concluido: cursoConcluido, certificado: !!matricula?.certificado_emitido };
      });
      setBoletim({ cursos: resultado, loading: false, erro: '' });
    } catch (error) {
      console.error('Erro ao carregar boletim:', error);
      setBoletim({ cursos: [], loading: false, erro: 'Não foi possível carregar seu boletim agora.' });
    }
  };

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, certificados_conquistados')
        .eq('id', user.id)
        .maybeSingle();

      setPerfil({
        nome: user.user_metadata?.full_name || '',
        email: user.email || '',
        telefone: user.user_metadata?.phone_contact || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        role: profileData?.role || 'user'
      });

      try {
        const [
          { count: sermoes },
          { count: aulasCompletas }
        ] = await Promise.all([
          supabase.from('sermoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('progresso_aulas').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('concluida_em', 'is', null)
        ]);

        setStats({
          sermoes: sermoes || 0,
          aulasCompletas: aulasCompletas || 0,
          certificados: profileData?.certificados_conquistados || 0,
          loading: false,
          erro: false,
        });
      } catch (statsErr) {
        // Se as estatísticas falharem, ainda liberamos a tela — só marcamos
        // o erro para não deixar os cards "presos" em loading para sempre.
        console.error('Erro ao carregar estatísticas:', statsErr);
        setStats(s => ({ ...s, loading: false, erro: true }));
      }
    } catch (error) {
      console.error('Erro ao carregar:', error.message);
      setStats(s => ({ ...s, loading: false, erro: true }));
    } finally {
      setLoading(false);
    }
  }

  // ── Seleção de arquivo → abre modal de crop ────────────────────────────────
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErro('Envie apenas imagens.'); e.target.value = ''; return; }
    if (file.size > AVATAR_MAX_BYTES) {
      setErro(`A imagem precisa ter até ${AVATAR_MAX_MB}MB. Escolha uma foto menor.`);
      e.target.value = '';
      return;
    }
    setErro('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagemCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    // Reseta o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // ── Confirma crop → faz upload ─────────────────────────────────────────────
  const handleCropConfirmar = async (blob) => {
    setUploadingAvatar(true);
    setErro('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `avatars/${user.id}.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      // Também salva em profiles para a Comunidade ler
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      setPerfil(p => ({ ...p, avatar_url: avatarUrl }));
      setImagemCropSrc(null);
    } catch (err) {
      setErro('Erro ao enviar imagem: ' + err.message);
      setImagemCropSrc(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErro('');
    if (querTrocarSenha) {
      if (!senhaAtual.trim()) { setErro('Informe sua senha atual.'); return; }
      if (novaSenha.trim().length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return; }
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email: perfil.email, password: senhaAtual });
      if (reAuthErr) { setErro('Senha atual incorreta.'); return; }
    }
    setUpdating(true);
    try {
      const updatePayload = { data: { full_name: perfil.nome, phone_contact: perfil.telefone } };
      if (querTrocarSenha && novaSenha.trim().length >= 6) updatePayload.password = novaSenha;
      const { error } = await supabase.auth.updateUser(updatePayload);
      if (error) throw error;
      setSenhaAtual(''); setNovaSenha(''); setQuerTrocarSenha(false);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setView('menu'); }, 2000);
    } catch (error) {
      setErro('Erro ao atualizar: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setModalLogout(false);
  };

  const baixarCard = async () => {
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Convite-Verbo-${perfil.nome.split(' ')[0]}.png`;
      link.click();
    } catch (err) { console.error(err); } finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFDFF]">
      <Loader2 className="animate-spin text-[#4C1D95]" size={32} />
    </div>
  );

  const inputClass = "w-full bg-transparent font-bold text-slate-700 outline-none px-2 text-sm";
  const labelClass = "text-[10px] font-bold uppercase text-gray-400 ml-2 block mb-1";

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">

      {/* Modal de crop */}
      <ModalCropAvatar
        imagemSrc={imagemCropSrc}
        onConfirmar={handleCropConfirmar}
        onCancelar={() => setImagemCropSrc(null)}
        uploading={uploadingAvatar}
      />

      <ModalLogout aberto={modalLogout} onConfirmar={handleLogout} onCancelar={() => setModalLogout(false)} loading={logoutLoading} />

      {/* ── Header com avatar ── */}
      <header className="mt-8 mb-8 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 bg-gradient-to-tr from-[#4C1D95] to-[#D946EF] rounded-[32px] flex items-center justify-center shadow-xl border-4 border-white overflow-hidden">
            {perfil.avatar_url
              ? <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-white">{perfil.nome.charAt(0) || 'P'}</span>
            }
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
            aria-label="Trocar foto de perfil"
            className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#4C1D95] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#5B21B6] active:scale-95 transition-all border-2 border-white">
            {uploadingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>

        {erro && !imagemCropSrc && view === 'menu' && (
          <div className="max-w-xs mx-auto mt-3 flex items-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600 text-left">{erro}</p>
          </div>
        )}

        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase mt-3">{perfil.nome || 'Pregador'}</h2>

        <div className="flex items-center justify-center gap-2 mt-2">
          <BadgePlano plano={plano} />
          {perfil.role === 'admin' && (
            <span className="inline-flex items-center gap-1 bg-slate-800 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              🛡️ Admin
            </span>
          )}
        </div>
      </header>

      {/* ── VIEW: MENU ── */}
      {view === 'menu' && (
        <div className="max-w-md mx-auto space-y-4 animate-in fade-in duration-500">

          {stats.loading ? (
            <div className="grid grid-cols-3 gap-3 mb-2">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : stats.erro ? (
            <div className="mb-2 flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <AlertTriangle size={14} className="text-slate-400 shrink-0" />
              <p className="text-xs font-medium text-slate-400">Não foi possível carregar suas estatísticas agora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-2">
              <StatCard icon={PenTool} color="bg-purple-50 text-[#4C1D95]" label="Sermões" value={stats.sermoes} sub="criados" />
              <StatCard icon={BookOpen} color="bg-green-50 text-green-500" label="Aulas" value={stats.aulasCompletas} sub="concluídas" />
              <StatCard icon={Award} color="bg-orange-50 text-orange-500" label="Certificados" value={stats.certificados} sub="de conclusão" />
            </div>
          )}

          {!isPlus && (
            <button onClick={() => navigate('/upgrade')}
              className={`w-full p-5 rounded-[28px] flex items-center justify-between active:scale-[0.98] transition-all ${
                isFundador ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-lg shadow-amber-100'
                           : 'bg-gradient-to-r from-[#4C1D95] to-[#7C3AED] shadow-lg shadow-purple-200'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl">
                  {isFundador ? <Crown size={18} className="text-white" /> : <Sparkles size={18} className="text-white" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-white text-xs uppercase tracking-tight">
                    {isFundador ? 'Upgrade para Plus' : 'Conheça os planos'}
                  </p>
                  <p className="text-[10px] text-white/70 font-bold">
                    {isFundador ? 'Acesse todos os cursos da Academia' : 'Sermões ilimitados + Academia Verbo'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-white/70" />
            </button>
          )}

          {perfil.role === 'admin' && (
            <Link to="/admin" className="w-full bg-slate-900 p-5 rounded-[28px] shadow-lg shadow-slate-200 flex items-center justify-between active:scale-[0.98] transition-all border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 text-yellow-400 rounded-2xl ring-1 ring-white/10">
                  <LayoutDashboard size={20} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-white text-xs uppercase tracking-tight block">Painel de Gestão</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gerir Cursos e Aulas</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600" />
            </Link>
          )}

          <button onClick={() => { setErro(''); setView('dados'); }} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#4C1D95] rounded-2xl"><User size={20} /></div>
              <span className="font-bold text-slate-700 text-sm">Meus Dados</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button onClick={() => setView('gerador')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl"><Instagram size={20} /></div>
              <div className="text-left">
                <span className="font-bold text-slate-700 text-sm block">Gerar Convite Instagram</span>
                <span className="text-[10px] text-gray-400 font-medium">QR Code para novos usuários</span>
              </div>
            </div>
            <Share2 size={18} className="text-gray-300" />
          </button>

          <button onClick={() => setView('boletim')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#4C1D95] rounded-2xl"><GraduationCap size={20} /></div>
              <div className="text-left"><span className="font-bold text-slate-700 text-sm block">Seu Boletim</span><span className="text-[10px] text-gray-400">Notas, matérias e cursos concluídos</span></div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button onClick={onOpenBiblia} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl"><Book size={20} /></div>
              <div className="text-left">
                <span className="font-bold text-slate-700 text-sm block">Bíblia Rápida</span>
                <span className="text-[10px] text-gray-400">Consulta rápida durante a preparação</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button onClick={() => setView('sobre')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Info size={20} /></div>
              <span className="font-bold text-slate-700 text-sm">Sobre o Verbo</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button onClick={() => setModalLogout(true)} className="w-full mt-2 p-5 text-red-500 font-bold text-xs uppercase tracking-widest bg-red-50 rounded-[28px] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2">
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      )}

      {/* ── VIEW: EDIÇÃO DE DADOS ── */}
      {view === 'dados' && (
        <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-3 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editar Informações</h3>
            <button type="button" onClick={() => setView('menu')} aria-label="Fechar" className="p-2 text-gray-400"><X size={20} /></button>
          </div>

          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
            <label className={labelClass}>E-mail (não editável)</label>
            <div className="flex items-center gap-2 px-2">
              <Mail size={15} className="text-slate-300 shrink-0" />
              <span className="text-sm font-bold text-slate-400 truncate">{perfil.email}</span>
              <Lock size={13} className="text-slate-300 ml-auto shrink-0" />
            </div>
            <p className="text-[10px] text-slate-300 font-medium mt-2 ml-2">Precisa trocar de e-mail? Fale com o suporte.</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Nome Completo</label>
            <input className={inputClass} value={perfil.nome} onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))} required />
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Telefone de Contato</label>
            <div className="flex items-center gap-2 px-2">
              <Phone size={15} className="text-slate-300 shrink-0" />
              <input className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm" value={perfil.telefone} onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))} />
            </div>
          </div>

          <button type="button" onClick={() => { setQuerTrocarSenha(q => !q); setSenhaAtual(''); setNovaSenha(''); setErro(''); }}
            className={`w-full p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${querTrocarSenha ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <KeyRound size={16} className={querTrocarSenha ? 'text-[#4C1D95]' : 'text-slate-300'} />
              <span className={`text-sm font-bold ${querTrocarSenha ? 'text-[#4C1D95]' : 'text-slate-500'}`}>
                {querTrocarSenha ? 'Cancelar troca de senha' : 'Trocar senha'}
              </span>
            </div>
            <ChevronRight size={16} className={`transition-transform ${querTrocarSenha ? 'rotate-90 text-[#4C1D95]' : 'text-slate-200'}`} />
          </button>

          {querTrocarSenha && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <label className={labelClass}>Senha Atual</label>
                <div className="flex items-center gap-2 px-2">
                  <KeyRound size={15} className="text-slate-300 shrink-0" />
                  <input type={mostrarSenhaAtual ? 'text' : 'password'} placeholder="Sua senha atual"
                    className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                    value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
                  <button type="button" onClick={() => setMostrarSenhaAtual(v => !v)}
                    aria-label={mostrarSenhaAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    {mostrarSenhaAtual ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <label className={labelClass}>Nova Senha</label>
                <div className="flex items-center gap-2 px-2">
                  <KeyRound size={15} className="text-[#4C1D95] shrink-0" />
                  <input type={mostrarNovaSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                    className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                    value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
                  <button type="button" onClick={() => setMostrarNovaSenha(v => !v)}
                    aria-label={mostrarNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                    className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    {mostrarNovaSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {novaSenha.length > 0 && (
                  <div className="mt-2 px-2">
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${novaSenha.length < 6 ? 'bg-red-400 w-1/4' : novaSenha.length < 10 ? 'bg-yellow-400 w-2/4' : 'bg-green-400 w-full'}`} />
                    </div>
                    <p className={`text-[9px] font-bold mt-1 ${novaSenha.length < 6 ? 'text-red-400' : novaSenha.length < 10 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {novaSenha.length < 6 ? 'Senha fraca' : novaSenha.length < 10 ? 'Senha média' : 'Senha forte'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in duration-200">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-600">{erro}</p>
            </div>
          )}

          <button type="submit" disabled={updating}
            className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg transition-all ${success ? 'bg-green-500' : 'bg-[#4C1D95] hover:bg-[#5B21B6]'}`}>
            {updating
              ? <Loader2 className="animate-spin mx-auto" size={20} />
              : success
                ? <span className="flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Salvo!</span>
                : 'Salvar Alterações'
            }
          </button>
        </form>
      )}

      {/* ── VIEW: GERADOR DE CARD ── */}
      {view === 'gerador' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Convite Social</h3>
            <button onClick={() => setView('menu')} aria-label="Fechar" className="p-2 text-gray-400"><X size={20} /></button>
          </div>
          <div className="mb-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Frase do Card</label>
            <input type="text" maxLength={60} className={inputClass} value={textoCard} onChange={e => setTextoCard(e.target.value)} />
          </div>
          <div ref={cardRef} className="aspect-[4/5] w-full bg-gradient-to-br from-[#4C1D95] to-[#D946EF] rounded-[40px] p-8 flex flex-col items-center justify-between text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="z-10">
              <div className="bg-white/20 px-4 py-1 rounded-full mx-auto backdrop-blur-md w-fit mb-2">
                <span className="text-white text-[10px] font-bold uppercase tracking-[3px]">por @ojefersonrocha</span>
              </div>
              <h4 className="text-4xl font-black text-white italic uppercase tracking-tighter">Verbo</h4>
            </div>
            <div className="bg-white p-5 rounded-[38px] shadow-2xl z-10">
              <QRCodeCanvas value={appUrl} size={160} level={"H"} />
            </div>
            <div className="z-10 space-y-4">
              <p className="text-white font-bold text-lg leading-tight px-2">{textoCard}</p>
              <div className="flex items-center justify-center gap-2 text-white/60">
                <Sparkles size={12} /><span className="text-[9px] font-bold uppercase tracking-widest">Acesse appverbo.com.br</span>
              </div>
            </div>
          </div>
          <button onClick={baixarCard} disabled={downloading} className="w-full mt-6 bg-slate-800 text-white py-5 rounded-[28px] font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-900 transition-colors">
            {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {downloading ? 'Gerando...' : 'Baixar Imagem'}
          </button>
        </div>
      )}

      {/* ── VIEW: BOLETIM ── */}
      {view === 'boletim' && (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-6">
            <div><p className="text-[9px] font-black uppercase tracking-widest text-purple-400">Academia Verbo</p><h3 className="font-black text-slate-800 uppercase text-sm tracking-widest mt-1">Seu Boletim</h3></div>
            <button onClick={() => setView('menu')} aria-label="Fechar" className="p-2 text-gray-400"><X size={20}/></button>
          </div>
          {!isAssinante ? (
            <div className="bg-white rounded-[32px] border border-purple-100 p-8 md:p-12 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-5 rounded-[24px] bg-purple-50 text-[#4C1D95] flex items-center justify-center"><GraduationCap size={30}/></div>
              <h4 className="text-xl font-black text-slate-800">Sua formação começa aqui.</h4>
              <p className="text-sm text-slate-400 leading-relaxed mt-3 max-w-md mx-auto">Assine o Verbo para ter acesso à Academia, acompanhar seu progresso, fazer avaliações e construir seu histórico de formação.</p>
              <button onClick={() => navigate('/upgrade')} className="mt-7 w-full max-w-sm mx-auto py-4 rounded-2xl bg-[#4C1D95] text-white text-xs font-black uppercase tracking-wide shadow-lg shadow-purple-100">Conhecer planos</button>
            </div>
          ) : boletim.loading ? (
            <div className="bg-white rounded-[32px] border border-slate-100 p-16 flex justify-center"><Loader2 className="animate-spin text-[#4C1D95]" size={28}/></div>
          ) : boletim.erro ? (
            <div className="bg-white rounded-[32px] border border-red-100 p-8 text-center text-sm font-bold text-red-500">{boletim.erro}</div>
          ) : boletim.cursos.length === 0 ? (
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 md:p-10 text-center">
              <BookOpen size={30} className="mx-auto text-purple-200 mb-4"/>
              <h4 className="font-black text-slate-800 text-lg">Você ainda não iniciou um curso.</h4>
              <p className="text-sm text-slate-400 mt-2">Acesse a Academia para escolher sua próxima formação.</p>
              <button onClick={() => navigate('/cursos')} className="mt-6 px-6 py-3 rounded-2xl bg-[#4C1D95] text-white text-xs font-black uppercase">Ir para a Academia</button>
            </div>
          ) : (
            <div className="space-y-4">
              {boletim.cursos.map(curso => (
                <div key={curso.id} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden">
                  <div className="p-5 border-b border-slate-50">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-purple-400">Curso</p><h4 className="font-black text-slate-800 text-base mt-1">{curso.titulo}</h4></div><span className={"text-[9px] font-black uppercase px-3 py-1.5 rounded-full "+(curso.concluido?'bg-emerald-50 text-emerald-600':'bg-purple-50 text-[#4C1D95]')}>{curso.concluido?'Concluído':curso.progresso+'%'}</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-4"><div className="h-full bg-[#4C1D95] rounded-full" style={{width:curso.progresso+'%'}}/></div>
                    <p className="text-[10px] text-slate-400 mt-2">{curso.aulasConcluidas} de {curso.totalAulas} aulas concluídas{curso.certificado?' · Certificado emitido':''}</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {curso.materias.map(materia => (
                      <div key={materia.id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div><p className="text-sm font-black text-slate-700">{materia.titulo}</p><p className="text-[10px] text-slate-400">{materia.concluidas}/{materia.totalAulas} aulas</p></div>
                          <span className={"text-[9px] font-black uppercase px-2.5 py-1 rounded-full "+(materia.concluida?'bg-emerald-50 text-emerald-600':'bg-slate-100 text-slate-500')}>{materia.concluida?'Concluída':materia.progresso+'%'}</span>
                        </div>
                        {materia.avaliacao && <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px]"><span className="font-bold text-slate-400">Avaliação · {materia.avaliacao.tentativas} tentativa(s)</span><span className={"font-black "+(materia.avaliacao.aprovado?'text-emerald-600':'text-amber-600')}>{materia.avaliacao.nota!==null?materia.avaliacao.nota+'%':'Não realizada'}{materia.avaliacao.aprovado?' · Aprovado':''}</span></div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW: SOBRE ── */}
      {view === 'sobre' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Sobre o Verbo</h3>
            <button onClick={() => setView('menu')} aria-label="Fechar" className="p-2 text-gray-400"><X size={20} /></button>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center mb-6">
            <h4 className="text-2xl font-black text-slate-800 tracking-tighter mb-2 italic uppercase">Verbo</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Conectando teologia profunda e tecnologia intuitiva para os pregadores do novo tempo.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-50">
              <div className="p-3 bg-purple-50 text-[#4C1D95] rounded-2xl"><ShieldCheck size={20} /></div>
              <div><h5 className="font-bold text-slate-700 text-sm">Criptografia</h5><p className="text-xs text-gray-400">Seus sermões são privados e protegidos.</p></div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-50">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Globe size={20} /></div>
              <div><h5 className="font-bold text-slate-700 text-sm">Escalabilidade</h5><p className="text-xs text-gray-400">Acesse de qualquer lugar do mundo em qualquer dispositivo.</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;