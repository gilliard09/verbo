import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, LogOut, Camera, Phone, 
  CheckCircle2, Loader2, Save, KeyRound,
  ChevronRight, Instagram, Info, Share2, X
} from 'lucide-react';

const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [view, setView] = useState('menu'); // 'menu' ou 'dados'
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
        data: { 
          full_name: perfil.nome, 
          phone_contact: perfil.telefone 
        }
      });
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

      {view === 'menu' ? (
        <div className="max-w-md mx-auto space-y-3">
          {/* CARD: MEUS DADOS */}
          <button onClick={() => setView('dados')} className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-[#5B2DFF] rounded-2xl"><User size={20}/></div>
              <span className="font-bold text-slate-700 text-sm">Meus Dados</span>
            </div>
            <ChevronRight size={18} className="text-gray-300"/>
          </button>

          {/* CARD: COMPARTILHAR PARA INSTAGRAM */}
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

          {/* CARD: SOBRE O APP */}
          <button className="w-full bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
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
      ) : (
        /* TELA DE EDIÇÃO DE DADOS */
        <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Editar Informações</h3>
            <button type="button" onClick={() => setView('menu')} className="p-2 text-gray-400"><X size={20}/></button>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Nome</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none px-2" value={perfil.nome} onChange={(e) => setPerfil({...perfil, nome: e.target.value})} />
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Telefone</label>
            <input className="w-full bg-transparent font-bold text-slate-700 outline-none px-2" value={perfil.telefone} onChange={(e) => setPerfil({...perfil, telefone: e.target.value})} />
          </div>

          <button type="submit" disabled={updating} className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${success ? 'bg-green-500' : 'bg-[#5B2DFF]'}`}>
            {updating ? <Loader2 className="animate-spin" size={20}/> : success ? <CheckCircle2 size={20}/> : <Save size={20}/>}
            {success ? 'Salvo!' : 'Salvar Alterações'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Perfil;