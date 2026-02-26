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
        // Cadastro: Envia o Nome para os metadados do Supabase
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: nome }
          }
        });
        if (error) throw error;
        alert("Conta criada com sucesso! Agora você já pode entrar.");
        setIsSignUp(false);
      } else {
        // Login: Entra direto com E-mail e Senha
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFF] p-6">
      
      {/* LOGO OFICIAL DO APP */}
      <div className="mb-10 text-center">
        <div className="w-32 h-32 mx-auto mb-4 drop-shadow-xl overflow-hidden rounded-[32px]">
          <img 
  src="/logo.png?v=1" 
  alt="Logo Verbo" 
  className="w-full h-full object-contain"
  style={{ display: 'block' }}
  onError={(e) => {
    console.error("Erro ao carregar a logo. Verifique se o arquivo está na pasta /public");
    e.target.src = 'https://ui-avatars.com/api/?name=Verbo&background=5B2DFF&color=fff&size=128'; 
  }}
/>
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase italic">
          Verbo
        </h1>
        <p className="text-gray-400 text-sm font-medium">O Verbo nasce da Palavra</p>
      </div>

      {/* FORMULÁRIO */}
      <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          {isSignUp ? 'Criar sua conta' : 'Acesse seu painel'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Nome Completo (Apenas se for cadastro) */}
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-gray-300" size={20} />
              <input
                type="text"
                placeholder="Seu nome completo"
                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all font-medium"
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
              placeholder="E-mail"
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all font-medium"
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
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#5B2DFF] outline-none transition-all font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5B2DFF] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#4822D9] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : isSignUp ? (
              <><UserPlus size={20} /> Criar Conta</>
            ) : (
              <><LogIn size={20} /> Entrar no App</>
            )}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-sm font-bold text-[#5B2DFF] hover:underline"
        >
          {isSignUp ? 'Já tem uma conta? Entrar' : 'Novo por aqui? Criar conta agora'}
        </button>
      </div>
      
      <p className="mt-12 text-[10px] text-gray-300 font-black uppercase tracking-[4px]">
        Por @ojefersonrocha • Verbo
      </p>
    </div>
  );
};

export default Login;