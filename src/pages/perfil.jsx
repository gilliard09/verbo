import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom'; // Adicionado para o link do Admin
import { 
  User, LogOut, Camera, Phone, 
  CheckCircle2, Loader2, Save, KeyRound,
  ChevronRight, Instagram, Info, Share2, X,
  Download, Sparkles, ShieldCheck, Globe, Heart,
  LayoutDashboard // Ícone para o Admin
} from 'lucide-react';

const Perfil = () => {
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState('menu'); // 'menu', 'dados', 'sobre', 'gerador'
  const [success, setSuccess] = useState(false);
  
  const [perfil, setPerfil] = useState({
    nome: '',
    email: '',
    telefone: '',
    avatar_url: '',
    role: 'user' // Adicionado estado para a role
  });

  const [novaSenha, setNovaSenha] = useState('');
  const [textoCard, setTextoCard] = useState("Escaneie e organize seus sermões agora mesmo!");

  const appUrl = window.location.origin; 

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscamos dados extras na tabela profiles que criamos
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        setPerfil({
          nome: user.user_metadata?.full_name || '',
          email: user.email || '',
          telefone: user.user_metadata?.phone_contact || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          role: profileData?.role || 'user' // Define se é admin ou user
        });
      }
    } catch (error) {
      console.error('Erro ao carregar:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name: perfil.nome, 
          phone_contact: perfil.telefone 
        }
      });
      if (updateError) throw updateError;

      if (novaSenha.trim().length >= 6) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: novaSenha
        });
        if (passwordError) throw passwordError;
        setNovaSenha('');
      }

      setSuccess(true);
      setTimeout(() => { setSuccess(false); setView('menu'); }, 2000);
    } catch (error) {
      alert("Erro ao atualizar: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const baixarCard = async () => {
    setDownloading(true);
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3,
        useCORS: true,
        backgroundColor: null 
      });
      const data = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = data;
      link.download = `Convite-Verbo-${perfil.nome.split(' ')[0]}.png`;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar imagem", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFDFF]">
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      {/* HEADER FIXO */}
      <header className="mt-8 mb-10 text-center">
        <div className="w-24 h-24 bg-gradient-to-tr from-[#5B2DFF] to-[#D946EF] rounded-[32px] mx-auto flex items-center justify-center shadow-xl border-4 border-white overflow-hidden mb-4">
          <span className="text-3xl font-black text-white">{perfil.nome.charAt(0) || 'P'}</span>
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{perfil.nome || 'Pregador'}</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
          {perfil.role === 'admin' ? '🛡️ Administrador' : 'Membro do Verbo'}
        </p>
      </header>

      {/* VIEW: MENU PRINCIPAL */}
      {view === 'menu' && (
        <div className="max-w-md mx-auto space-y-3 animate-in fade-in duration-500">
          
          {/* BOTÃO EXCLUSIVO DE ADMIN */}
          {perfil.role === 'admin' && (
            <Link to="/admin" className="w-full bg-slate-900 p-5 rounded-[28px] shadow-lg shadow-slate-200 flex items-center justify-between active:scale-[0.98] transition-all border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 text-yellow-400 rounded-2xl ring-1 ring-white/10">
                  <LayoutDashboard size={20}/>
                </div>
                <div className="text-left">
                  <span className="font-black text-white text-xs uppercase tracking-tight block">Painel de Gestão</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Gerir Cursos e Aulas</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600"/>
            </Link>
          )}

          <button onClick={() => setView('dados')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><User size={20}/></div>
              <span className="font-bold text-slate-700 text-sm">Meus Dados</span>
            </div>
            <ChevronRight size={18} className="text-gray-300"/>
          </button>

          <button onClick={() => setView('gerador')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl"><Instagram size={20}/></div>
              <div className="text-left">
                <span className="font-bold text-slate-700 text-sm block">Gerar Convite Instagram</span>
                <span className="text-[10px] text-gray-400 font-medium">QR Code para novos usuários</span>
              </div>
            </div>
            <Share2 size={18} className="text-gray-300"/>
          </button>

          <button onClick={() => setView('sobre')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Info size={20}/></div>
              <span className="font-bold text-slate-700 text-sm">Sobre o Verbo</span>
            </div>
            <ChevronRight size={18} className="text-gray-300"/>
          </button>

          <button onClick={() => supabase.auth.signOut()} className="w-full mt-6 p-5 text-red-500 font-bold text-xs uppercase tracking-widest bg-red-50 rounded-[28px] active:scale-95 transition-all shadow-sm">
            Encerrar Sessão
          </button>
        </div>
      )}

      {/* VIEW: EDIÇÃO DE DADOS */}
      {view === 'dados' && (
        <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editar Informações</h3>
            <button type="button" onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Nome Completo</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none px-2" value={perfil.nome} onChange={(e) => setPerfil({...perfil, nome: e.target.value})} required />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Telefone de Contato</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none px-2" value={perfil.telefone} onChange={(e) => setPerfil({...perfil, telefone: e.target.value})} />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Redefinir Senha (opcional)</label>
            <div className="flex items-center gap-2 px-2">
              <KeyRound size={16} className="text-[#5B2DFF]" />
              <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={updating} className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg transition-all ${success ? 'bg-green-500' : 'bg-[#5B2DFF]'}`}>
            {updating ? <Loader2 className="animate-spin mx-auto" size={20}/> : success ? 'Sucesso!' : 'Salvar Alterações'}
          </button>
        </form>
      )}

      {/* VIEW: GERADOR DE CARD */}
      {view === 'gerador' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Convite Social</h3>
            <button onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>

          <div className="mb-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Frase do Card</label>
            <input 
              type="text"
              maxLength={60}
              className="w-full bg-transparent font-bold text-slate-700 outline-none px-2 text-sm"
              value={textoCard}
              onChange={(e) => setTextoCard(e.target.value)}
            />
          </div>

          <div ref={cardRef} className="aspect-[4/5] w-full bg-gradient-to-br from-[#5B2DFF] to-[#D946EF] rounded-[40px] p-8 flex flex-col items-center justify-between text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
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
                <Sparkles size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Acesse verbo-app.vercel.app</span>
              </div>
            </div>
          </div>

          <button onClick={baixarCard} disabled={downloading} className="w-full mt-6 bg-slate-800 text-white py-5 rounded-[28px] font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-900 transition-colors">
            {downloading ? <Loader2 className="animate-spin" size={20}/> : <Download size={20}/>}
            {downloading ? 'Gerando...' : 'Baixar Imagem'}
          </button>
        </div>
      )}

      {/* VIEW: SOBRE */}
      {view === 'sobre' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Sobre o Verbo</h3>
            <button onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center mb-6">
            <h4 className="text-2xl font-black text-slate-800 tracking-tighter mb-2 italic uppercase">Verbo</h4>
            <p className="text-gray-400 text-sm leading-relaxed">Conectando teologia profunda e tecnologia intuitiva para os pregadores do novo tempo.</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-50">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><ShieldCheck size={20}/></div>
              <div><h5 className="font-bold text-slate-700 text-sm">Criptografia</h5><p className="text-xs text-gray-400">Seus sermões são privados e protegidos.</p></div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-gray-50">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Globe size={20}/></div>
              <div><h5 className="font-bold text-slate-700 text-sm">Escalabilidade</h5><p className="text-xs text-gray-400">Acesse de qualquer lugar do mundo.</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;