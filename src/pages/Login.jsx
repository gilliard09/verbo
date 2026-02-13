import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, UserPlus, User } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: nome }
          }
        });
        if (error) throw error;
        alert("Conta criada com sucesso! Você já pode entrar.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFF] p-6">
      
      {/* SEÇÃO DA LOGO OFICIAL */}
      <div className="mb-10 text-center">
        <div className="w-28 h-28 mx-auto mb-4 drop-shadow-md">
          <img 
            src="/logo.png" 
            alt="Logo Verbo" 
            className="w-full h-full object-contain"
            // Se a imagem não carregar, ele mostra um ícone reserva
            onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=VERBO'} 
          />
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase italic">
          Verbo
        </h1>
        <p className="text-gray-400 text-sm font-medium">A plataforma do pregador moderno</p>
      </div>

      {/* CARD DE LOGIN */}
      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          {isSignUp ? 'Criar sua conta' : 'Bem-vindo de volta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Nome (Apenas no Cadastro) */}
          {isSignUp && (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <User className="absolute left-4 top-3.5 text-gray-300" size={20} />
              <input
                type="text"
                placeholder="Seu nome completo"
                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required={isSignUp}
              />
            </div>
          )}

          {/* E-mail */}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-300" size={20} />
            <input
              type="email"
              placeholder="Seu e-mail"
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Senha */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-300" size={20} />
            <input
              type="password"
              placeholder="Sua senha"
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5B2DFF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#3A1DB8] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : isSignUp ? (
              <><UserPlus size={20} /> Criar Conta</>
            ) : (
              <><LogIn size={20} /> Entrar</>
            )}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-sm font-bold text-[#5B2DFF] hover:underline"
        >
          {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Começar agora'}
        </button>
      </div>
      
      <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[4px]">
        Verbo • School Tech
      </p>
    </div>
  );
};

export default Login;