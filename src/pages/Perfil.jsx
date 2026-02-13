import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, LogOut, Camera, Phone, 
  CheckCircle2, Loader2, Save, KeyRound 
} from 'lucide-react';

const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
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
          telefone: user.phone || '',
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
    setSuccess(false);

    try {
      // 1. Atualizar Metadados (Nome e Foto)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: perfil.nome, avatar_url: perfil.avatar_url },
        phone: perfil.telefone !== '' ? perfil.telefone : undefined
      });

      // 2. Atualizar Senha (se preenchida)
      if (novaSenha.length >= 6) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: novaSenha
        });
        if (passwordError) throw passwordError;
        setNovaSenha('');
      }

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert("Erro ao atualizar: " + error.message);
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
      <header className="mt-8 mb-10 text-center">
        <div className="relative inline-block">
          <div className="w-28 h-28 bg-gradient-to-tr from-[#5B2DFF] to-[#D946EF] rounded-[36px] flex items-center justify-center shadow-xl border-4 border-white overflow-hidden">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-white">{perfil.nome.charAt(0) || 'P'}</span>
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-white p-2 rounded-2xl shadow-lg text-[#5B2DFF] active:scale-90 transition-all border border-gray-100">
            <Camera size={20} />
          </button>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="max-w-md mx-auto space-y-4">
        {/* Nome */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Nome Completo</label>
          <div className="flex items-center gap-3 px-2">
            <User size={18} className="text-[#5B2DFF]" />
            <input 
              className="w-full bg-transparent font-bold text-slate-700 outline-none"
              value={perfil.nome}
              onChange={(e) => setPerfil({...perfil, nome: e.target.value})}
            />
          </div>
        </div>

        {/* Telefone */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Telefone</label>
          <div className="flex items-center gap-3 px-2">
            <Phone size={18} className="text-[#5B2DFF]" />
            <input 
              placeholder="Ex: +5511999999999"
              className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
              value={perfil.telefone}
              onChange={(e) => setPerfil({...perfil, telefone: e.target.value})}
            />
          </div>
        </div>

        {/* Alterar Senha */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Nova Senha (mín. 6 carac.)</label>
          <div className="flex items-center gap-3 px-2">
            <KeyRound size={18} className="text-[#5B2DFF]" />
            <input 
              type="password"
              placeholder="Deixe em branco para não mudar"
              className="w-full bg-transparent font-bold text-slate-700 outline-none text-sm"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
          </div>
        </div>

        {/* Botão de Salvar */}
        <button 
          type="submit"
          disabled={updating}
          className={`w-full py-5 rounded-[28px] font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${success ? 'bg-green-500 shadow-green-100' : 'bg-[#5B2DFF] shadow-purple-100'}`}
        >
          {updating ? <Loader2 className="animate-spin" size={20} /> : 
           success ? <><CheckCircle2 size={20} /> Dados Atualizados!</> : 
           <><Save size={20} /> Salvar Alterações</>}
        </button>

        <button 
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="w-full py-5 bg-gray-50 text-gray-400 rounded-[28px] font-bold text-sm mt-4 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          Sair da Conta
        </button>
      </form>
    </div>
  );
};

export default Perfil;