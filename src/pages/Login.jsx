import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Enviando Magic Link (O usuário clica no e-mail e entra direto)
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      alert("Erro: " + error.message);
    } else {
      setMessage('✅ Verifique seu e-mail para confirmar o acesso!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FDFDFF]">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="Logo VERBO" className="w-24 h-24 mx-auto mb-6 rounded-3xl shadow-2xl" />
        
        <h1 className="text-4xl font-black bg-gradient-to-r from-[#5B2DFF] to-[#3A1DB8] bg-clip-text text-transparent mb-2">
          VERBO
        </h1>
        <p className="text-gray-400 font-medium mb-10 italic">O Verbo nasce da Palavra.</p>

        {message ? (
          <div className="bg-green-50 text-green-600 p-4 rounded-2xl font-bold animate-bounce">
            {message}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-white shadow-sm outline-none focus:ring-2 focus:ring-[#5B2DFF] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button
              disabled={loading}
              className="w-full bg-[#5B2DFF] text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-[#3A1DB8] transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Preparando acesso...' : <><LogIn size={20} /> Entrar Agora</>}
            </button>
            
            <p className="text-[10px] text-gray-400 mt-6 px-4">
              Ao entrar, você terá acesso aos seus sermões exclusivos e conteúdos do curso.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;