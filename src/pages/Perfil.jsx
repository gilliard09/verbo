import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, LogOut, Camera, Phone, 
  CheckCircle2, Loader2, Save, KeyRound,
  ChevronRight, Instagram, Info, Share2, X,
  Globe, ShieldCheck, Heart
} from 'lucide-react';

const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [view, setView] = useState('menu'); // 'menu', 'dados' ou 'sobre'
  const [success, setSuccess] = useState(false);
  
  const [perfil, setPerfil] = useState({
    nome: '',
    email: '',
    telefone: '',
    avatar_url: ''
  });

  const [novaSenha, setNovaSenha] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setPerfil({
          nome: user.user_metadata?.full_name || '',
          email: user.email || '',
          telefone: user.user_metadata?.phone_contact || '',
          avatar_url: user.user_metadata?.avatar_url || ''
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
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: perfil.nome, phone_contact: perfil.telefone }
      });
      if (novaSenha.trim().length >= 6) {
        await supabase.auth.updateUser({ password: novaSenha });
        setNovaSenha('');
      }
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setView('menu'); }, 2000);
    } catch (error) {
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#FDFDFF]">
      <Loader2 className="animate-spin text-[#5B2DFF]" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 pb-32">
      {/* HEADER DO PERFIL */}
      <header className="mt-8 mb-10 text-center">
        <div className="w-24 h-24 bg-gradient-to-tr from-[#5B2DFF] to-[#D946EF] rounded-[32px] mx-auto flex items-center justify-center shadow-xl border-4 border-white overflow-hidden mb-4">
          <span className="text-3xl font-black text-white">{perfil.nome.charAt(0) || 'P'}</span>
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{perfil.nome || 'Pregador'}</h2>
        <p className="text-gray-400 text-xs font-medium">{perfil.email}</p>
      </header>

      {view === 'menu' && (
        <div className="max-w-md mx-auto space-y-3 animate-in fade-in duration-500">
          <button onClick={() => setView('dados')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><User size={20}/></div>
              <span className="font-bold text-slate-700 text-sm">Meus Dados</span>
            </div>
            <ChevronRight size={18} className="text-gray-300"/>
          </button>

          <button className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl"><Instagram size={20}/></div>
              <div className="text-left">
                <span className="font-bold text-slate-700 text-sm block">Gerar Card Instagram</span>
                <span className="text-[10px] text-gray-400 font-medium">Crie imagens dos seus sermões</span>
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

          <button onClick={() => supabase.auth.signOut()} className="w-full mt-6 p-5 text-red-500 font-bold text-sm bg-red-50 rounded-[28px]">
            Sair da Conta
          </button>
        </div>
      )}

      {view === 'dados' && (
        <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editar Informações</h3>
            <button type="button" onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Nome</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none" value={perfil.nome} onChange={(e) => setPerfil({...perfil, nome: e.target.value})} />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Telefone</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none" value={perfil.telefone} onChange={(e) => setPerfil({...perfil, telefone: e.target.value})} />
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 block">Nova Senha</label>
            <input type="password" placeholder="Mínimo 6 caracteres" className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          </div>
          <button type="submit" className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg ${success ? 'bg-green-500' : 'bg-[#5B2DFF]'}`}>
            {updating ? 'Salvando...' : success ? 'Sucesso!' : 'Salvar Alterações'}
          </button>
        </form>
      )}

      {view === 'sobre' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Sobre a Plataforma</h3>
            <button onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain opacity-80" />
              </div>
              <h4 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">Verbo</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Desenvolvido para simplificar a vida do pregador moderno, unindo teologia profunda e tecnologia descomplicada.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><ShieldCheck size={20}/></div>
                <div>
                  <h5 className="font-bold text-slate-700 text-sm">Privacidade Total</h5>
                  <p className="text-xs text-gray-400 mt-1">Seus sermões são armazenados de forma segura e privada.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><Globe size={20}/></div>
                <div>
                  <h5 className="font-bold text-slate-700 text-sm">Acesso de Qualquer Lugar</h5>
                  <p className="text-xs text-gray-400 mt-1">Sincronização em tempo real entre todos os seus dispositivos.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4">
                <div className="p-3 bg-red-50 text-red-500 rounded-2xl"><Heart size={20}/></div>
                <div>
                  <h5 className="font-bold text-slate-700 text-sm">Feito por um pregador</h5>
                  <p className="text-xs text-gray-400 mt-1">Criado pelo Pastor Jeferson para potencializar a sua voz no mundo digital.</p>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-300 font-black uppercase tracking-[4px] py-6">
              Versão 1.0.0 • Verbo
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;