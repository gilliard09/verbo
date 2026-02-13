import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, UserPlus, Sparkles } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Alterna entre Login e Cadastro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Lógica de Cadastro (Criar conta com senha)
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Conta criada com sucesso! Você já pode entrar.");
        setIsSignUp(false); // Volta para a tela de login
      } else {
        // Lógica de Login (Entrar com senha)
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
      {/* Logo e Título */}
      <div className="mb-10 text-center">
        <div className="bg-[#5B2DFF] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 mx-auto mb-4 rotate-3">
          <Sparkles className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase">Verbo</h1>
        <p className="text-gray-400 text-sm font-medium">A plataforma do pregador moderno</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          {isSignUp ? 'Criar sua conta' : 'Bem-vindo de volta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Campo E-mail */}
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

          {/* Campo Senha */}
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

        {/* Alternar entre Login e Cadastro */}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-sm font-bold text-[#5B2DFF] hover:underline"
        >
          {isSignUp ? 'Já tenho uma conta? Entrar' : 'Não tem conta? Criar uma agora'}
        </button>
      </div>

      <p className="mt-10 text-[10px] text-gray-300 font-bold uppercase tracking-widest text-center max-w-[200px]">
        Desenvolvido para transformar sua pregação
      </p>
    </div>
  );
};

export default Login;