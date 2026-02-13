import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, UserPlus, Sparkles, User } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [nome, setNome] = useState(''); // Novo estado para o nome
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Cadastro com Nome nos metadados
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nome, // Salva o nome aqui
            }
          }
        });
        if (error) throw error;
        alert("Conta criada com sucesso, " + nome + "!");
        setIsSignUp(false);
      } else {
        // Login normal
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
      <div className="mb-10 text-center">
        <div className="bg-[#5B2DFF] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 mx-auto mb-4 rotate-3">
          <Sparkles className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase">Verbo</h1>
        <p className="text-gray-400 text-sm font-medium italic">"A sua voz no mundo digital"</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          {isSignUp ? 'Comece sua jornada' : 'Bem-vindo de volta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* CAMPO NOME - Só aparece se for Cadastro */}
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

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-300" size={20} />
            <input
              type="email"
              placeholder="E-mail"
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-300" size={20} />
            <input
              type="password"
              placeholder="Senha"
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
              <><UserPlus size={20} /> Criar Minha Conta</>
            ) : (
              <><LogIn size={20} /> Entrar no App</>
            )}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-sm font-bold text-[#5B2DFF] hover:underline"
        >
          {isSignUp ? 'Já tem conta? Faça Login' : 'Novo por aqui? Cadastre-se'}
        </button>
      </div>
    </div>
  );
};

export default Login;