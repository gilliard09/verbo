import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import {
  User, LogOut, Camera, Phone,
  CheckCircle2, Loader2, Save, KeyRound,
  ChevronRight, Instagram, Info, Share2, X,
  Download, Sparkles, ShieldCheck, Globe, Heart,
  LayoutDashboard, Mail, Lock, Eye, EyeOff,
  PenTool, BookOpen, TrendingUp, Award, AlertTriangle
} from 'lucide-react';

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
          <button onClick={onCancelar} className="flex-1 py-4 rounded-2xl border border-slate-200 font-black text-xs uppercase text-slate-600 hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={loading} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase hover:bg-red-600 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={14} /> : <><LogOut size={14} /> Sair</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card de estatística ──────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, color, label, value, sub }) => (
  <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex flex-col gap-2">
    <div className={`p-2.5 rounded-xl w-fit ${color}`}>
      <Icon size={18} />
    </div>
    <p className="text-3xl font-black text-slate-800 italic leading-none">{value}</p>
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[9px] text-slate-300 font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const Perfil = () => {
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [view, setView] = useState('menu');
  const [success, setSuccess] = useState(false);
  const [erro, setErro] = useState('');
  const [modalLogout, setModalLogout] = useState(false);

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
    sermoes: 0, aulasCompletas: 0, cursosMatriculados: 0, loading: true
  });

  const [textoCard, setTextoCard] = useState("Escaneie e organize seus sermões agora mesmo!");
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  useEffect(() => { getProfile(); }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle();

      setPerfil({
        nome: user.user_metadata?.full_name || '',
        email: user.email || '',
        telefone: user.user_metadata?.phone_contact || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        role: profileData?.role || 'user'
      });

      // Estatísticas em paralelo
      const [
        { count: sermoes },
        { count: aulasCompletas },
        { count: cursosMatriculados }
      ] = await Promise.all([
        supabase.from('sermoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('progresso_aulas').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('matriculas').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      setStats({ sermoes: sermoes || 0, aulasCompletas: aulasCompletas || 0, cursosMatriculados: cursosMatriculados || 0, loading: false });
    } catch (error) {
      console.error('Erro ao carregar:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Upload de avatar ────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErro('Envie apenas imagens.'); return; }

    setUploadingAvatar(true);
    setErro('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`; // cache bust

      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      setPerfil(p => ({ ...p, avatar_url: avatarUrl }));
    } catch (err) {
      setErro('Erro ao enviar imagem: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Salvar dados ────────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    setErro('');

    // Validação de senha
    if (querTrocarSenha) {
      if (!senhaAtual.trim()) { setErro('Informe sua senha atual.'); return; }
      if (novaSenha.trim().length < 6) { setErro('A nova senha deve ter ao menos 6 caracteres.'); return; }

      // Verifica senha atual reautenticando
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: perfil.email,
        password: senhaAtual
      });
      if (reAuthErr) { setErro('Senha atual incorreta.'); return; }
    }

    setUpdating(true);
    try {
      const updatePayload = { data: { full_name: perfil.nome, phone_contact: perfil.telefone } };
      if (querTrocarSenha && novaSenha.trim().length >= 6) {
        updatePayload.password = novaSenha;
      }

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

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    setLogoutLoading(false);
    setModalLogout(false);
  };

  // ─── Download do card ────────────────────────────────────────────────────────
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
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  const inputClass = "w-full bg-transparent font-bold text-slate-700 outline-none px-2 text-sm";
  const labelClass = "text-[10px] font-black uppercase text-gray-400 ml-2 block mb-1";

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">

      <ModalLogout
        aberto={modalLogout}
        onConfirmar={handleLogout}
        onCancelar={() => setModalLogout(false)}
        loading={logoutLoading}
      />

      {/* ── Header com avatar ── */}
      <header className="mt-8 mb-8 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 bg-gradient-to-tr from-[#5B2DFF] to-[#D946EF] rounded-[32px] flex items-center justify-center shadow-xl border-4 border-white overflow-hidden">
            {perfil.avatar_url
              ? <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl font-black text-white">{perfil.nome.charAt(0) || 'P'}</span>
            }
          </div>

          {/* Botão de upload de foto */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#5B2DFF] text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-[#4a22e0] active:scale-95 transition-all border-2 border-white"
          >
            {uploadingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{perfil.nome || 'Pregador'}</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
          {perfil.role === 'admin' ? '🛡️ Administrador' : 'Membro do Verbo'}
        </p>
      </header>

      {/* ── VIEW: MENU ── */}
      {view === 'menu' && (
        <div className="max-w-md mx-auto space-y-4 animate-in fade-in duration-500">

          {/* Estatísticas pessoais */}
          {!stats.loading && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              <StatCard icon={PenTool} color="bg-purple-50 text-[#5B2DFF]" label="Sermões" value={stats.sermoes} sub="criados" />
              <StatCard icon={BookOpen} color="bg-green-50 text-green-500" label="Aulas" value={stats.aulasCompletas} sub="concluídas" />
              <StatCard icon={Award} color="bg-orange-50 text-orange-500" label="Cursos" value={stats.cursosMatriculados} sub="matriculado" />
            </div>
          )}

          {/* Botão admin */}
          {perfil.role === 'admin' && (
            <Link to="/admin" className="w-full bg-slate-900 p-5 rounded-[28px] shadow-lg shadow-slate-200 flex items-center justify-between active:scale-[0.98] transition-all border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 text-yellow-400 rounded-2xl ring-1 ring-white/10">
                  <LayoutDashboard size={20} />
                </div>
                <div className="text-left">
                  <span className="font-black text-white text-xs uppercase tracking-tight block">Painel de Gestão</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gerir Cursos e Aulas</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600" />
            </Link>
          )}

          <button onClick={() => { setErro(''); setView('dados'); }} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><User size={20} /></div>
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

          <button onClick={() => setView('sobre')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Info size={20} /></div>
              <span className="font-bold text-slate-700 text-sm">Sobre o Verbo</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button
            onClick={() => setModalLogout(true)}
            className="w-full mt-2 p-5 text-red-500 font-bold text-xs uppercase tracking-widest bg-red-50 rounded-[28px] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      )}

      {/* ── VIEW: EDIÇÃO DE DADOS ── */}
      {view === 'dados' && (
        <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-3 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editar Informações</h3>
            <button type="button" onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20} /></button>
          </div>

          {/* Email somente leitura */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
            <label className={labelClass}>E-mail (não editável)</label>
            <div className="flex items-center gap-2 px-2">
              <Mail size={15} className="text-slate-300 shrink-0" />
              <span className="text-sm font-bold text-slate-400 truncate">{perfil.email}</span>
              <Lock size={13} className="text-slate-300 ml-auto shrink-0" />
            </div>
          </div>

          {/* Nome */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Nome Completo</label>
            <input className={inputClass} value={perfil.nome} onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))} required />
          </div>

          {/* Telefone */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Telefone de Contato</label>
            <div className="flex items-center gap-2 px-2">
              <Phone size={15} className="text-slate-300 shrink-0" />
              <input className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm" value={perfil.telefone} onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))} />
            </div>
          </div>

          {/* Toggle de troca de senha */}
          <button
            type="button"
            onClick={() => { setQuerTrocarSenha(q => !q); setSenhaAtual(''); setNovaSenha(''); setErro(''); }}
            className={`w-full p-4 rounded-3xl border text-left flex items-center justify-between transition-all ${querTrocarSenha ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <KeyRound size={16} className={querTrocarSenha ? 'text-[#5B2DFF]' : 'text-slate-300'} />
              <span className={`text-sm font-bold ${querTrocarSenha ? 'text-[#5B2DFF]' : 'text-slate-500'}`}>
                {querTrocarSenha ? 'Cancelar troca de senha' : 'Trocar senha'}
              </span>
            </div>
            <ChevronRight size={16} className={`transition-transform ${querTrocarSenha ? 'rotate-90 text-[#5B2DFF]' : 'text-slate-200'}`} />
          </button>

          {/* Campos de senha — aparecem só quando ativado */}
          {querTrocarSenha && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              {/* Senha atual */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <label className={labelClass}>Senha Atual</label>
                <div className="flex items-center gap-2 px-2">
                  <KeyRound size={15} className="text-slate-300 shrink-0" />
                  <input
                    type={mostrarSenhaAtual ? 'text' : 'password'}
                    placeholder="Sua senha atual"
                    className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                  />
                  <button type="button" onClick={() => setMostrarSenhaAtual(v => !v)} className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    {mostrarSenhaAtual ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <label className={labelClass}>Nova Senha</label>
                <div className="flex items-center gap-2 px-2">
                  <KeyRound size={15} className="text-[#5B2DFF] shrink-0" />
                  <input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                  />
                  <button type="button" onClick={() => setMostrarNovaSenha(v => !v)} className="text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                    {mostrarNovaSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Indicador de força */}
                {novaSenha.length > 0 && (
                  <div className="mt-2 px-2">
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${novaSenha.length < 6 ? 'bg-red-400 w-1/4' : novaSenha.length < 10 ? 'bg-yellow-400 w-2/4' : 'bg-green-400 w-full'}`}
                      />
                    </div>
                    <p className={`text-[9px] font-bold mt-1 ${novaSenha.length < 6 ? 'text-red-400' : novaSenha.length < 10 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {novaSenha.length < 6 ? 'Senha fraca' : novaSenha.length < 10 ? 'Senha média' : 'Senha forte'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Erro inline */}
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in duration-200">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-600">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={updating}
            className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg transition-all ${success ? 'bg-green-500' : 'bg-[#5B2DFF] hover:bg-[#4a22e0]'}`}
          >
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
            <button onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20} /></button>
          </div>
          <div className="mb-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className={labelClass}>Frase do Card</label>
            <input type="text" maxLength={60} className={inputClass} value={textoCard} onChange={e => setTextoCard(e.target.value)} />
          </div>
          <div ref={cardRef} className="aspect-[4/5] w-full bg-gradient-to-br from-[#5B2DFF] to-[#D946EF] rounded-[40px] p-8 flex flex-col items-center justify-between text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="z-10">
              <div className="bg-white/20 px-4 py-1 rounded-full mx-auto backdrop-blur-md w-fit mb-2">
                <span className="text-white text-[10px] font-black uppercase tracking-[3px]">por @ojefersonrocha</span>
              </div>
              <h4 className="text-4xl font-black text-white italic uppercase tracking-tighter">Verbo</h4>
            </div>
            <div className="bg-white p-5 rounded-[38px] shadow-2xl z-10">
              <QRCodeCanvas value={appUrl} size={160} level={"H"} />
            </div>
            <div className="z-10 space-y-4">
              <p className="text-white font-bold text-lg leading-tight px-2">{textoCard}</p>
              <div className="flex items-center justify-center gap-2 text-white/60">
                <Sparkles size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Acesse appverbo.com.br</span>
              </div>
            </div>
          </div>
          <button onClick={baixarCard} disabled={downloading} className="w-full mt-6 bg-slate-800 text-white py-5 rounded-[28px] font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-900 transition-colors">
            {downloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {downloading ? 'Gerando...' : 'Baixar Imagem'}
          </button>
        </div>
      )}

      {/* ── VIEW: SOBRE ── */}
      {view === 'sobre' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Sobre o Verbo</h3>
            <button onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20} /></button>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center mb-6">
            <h4 className="text-2xl font-black text-slate-800 tracking-tighter mb-2 italic uppercase">Verbo</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Conectando teologia profunda e tecnologia intuitiva para os pregadores do novo tempo.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-50">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><ShieldCheck size={20} /></div>
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