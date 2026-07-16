import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, UserPlus, User, AlertCircle, CheckCircle2, X } from 'lucide-react';

// Traduz as mensagens mais comuns do Supabase Auth para português
const traduzirErro = (mensagem = '') => {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail. Tente entrar.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Digite um e-mail válido.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante e tente novamente.';
  if (m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return 'Algo deu errado. Tente novamente em instantes.';
};

// ─── Banner de feedback (substitui o alert nativo) ──────────────────────────
const FeedbackBanner = ({ tipo, mensagem, onClose }) => {
  if (!mensagem) return null;
  const isErro = tipo === 'erro';
  return (
    <div
      className={`mb-5 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium border animate-slide-down ${
        isErro
          ? 'bg-red-50 border-red-100 text-red-600'
          : 'bg-green-50 border-green-100 text-green-700'
      }`}
      role="alert"
    >
      {isErro ? (
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
      )}
      <p className="flex-1 leading-snug">{mensagem}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Fechar aviso">
        <X size={16} />
      </button>
    </div>
  );
};

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ tipo: null, mensagem: '' });

  // Limpa o feedback sempre que a pessoa troca de modo (login/cadastro/recuperar)
  useEffect(() => {
    setFeedback({ tipo: null, mensagem: '' });
  }, [isSignUp, modoRecuperar]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ tipo: null, mensagem: '' });

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
        setFeedback({ tipo: 'sucesso', mensagem: 'Conta criada com sucesso! Agora você já pode entrar.' });
        setIsSignUp(false);
        setPassword('');
      } else {
        // Login: Entra direto com E-mail e Senha
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: traduzirErro(error.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setFeedback({ tipo: 'erro', mensagem: 'Digite seu e-mail para receber o link de recuperação.' });
      return;
    }
    setLoading(true);
    setFeedback({ tipo: null, mensagem: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setFeedback({ tipo: 'sucesso', mensagem: 'Enviamos um link de recuperação para o seu e-mail.' });
    } catch (error) {
      setFeedback({ tipo: 'erro', mensagem: traduzirErro(error.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-6 relative overflow-hidden">
      <style>{`
        .login-glow {
          background:
            radial-gradient(ellipse 90% 55% at 50% -10%, rgba(76,29,149,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 70% 45% at 15% 90%, rgba(124,58,237,0.05) 0%, transparent 60%);
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease; }

        .field-collapse {
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.3s ease, margin 0.35s ease;
        }
      `}</style>

      <div className="login-glow absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center">
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
                e.target.src = 'https://ui-avatars.com/api/?name=Verbo&background=4C1D95&color=fff&size=128';
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
          <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">
            {modoRecuperar ? 'Recuperar senha' : isSignUp ? 'Criar sua conta' : 'Acesse seu painel'}
          </h2>
          <p className="text-gray-400 text-xs font-medium text-center mb-6">
            {modoRecuperar
              ? 'Enviaremos um link para redefinir sua senha.'
              : isSignUp
                ? 'Leva menos de 1 minuto. Grátis para começar.'
                : 'Seus sermões estão te esperando.'}
          </p>

          <FeedbackBanner
            tipo={feedback.tipo}
            mensagem={feedback.mensagem}
            onClose={() => setFeedback({ tipo: null, mensagem: '' })}
          />

          <form onSubmit={modoRecuperar ? handleRecuperarSenha : handleAuth} className="space-y-4">
            {/* Nome Completo (Apenas se for cadastro) */}
            <div
              className="field-collapse"
              style={{
                maxHeight: isSignUp && !modoRecuperar ? '80px' : '0px',
                opacity: isSignUp && !modoRecuperar ? 1 : 0,
                marginBottom: isSignUp && !modoRecuperar ? '16px' : '0px',
              }}
            >
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-gray-300" size={20} />
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#4C1D95] outline-none transition-all font-medium"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required={isSignUp && !modoRecuperar}
                  tabIndex={isSignUp && !modoRecuperar ? 0 : -1}
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-300" size={20} />
              <input
                type="email"
                placeholder="E-mail"
                className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#4C1D95] outline-none transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Senha (some no modo recuperar) */}
            <div
              className="field-collapse"
              style={{
                maxHeight: !modoRecuperar ? '80px' : '0px',
                opacity: !modoRecuperar ? 1 : 0,
                marginBottom: !modoRecuperar ? '16px' : '0px',
              }}
            >
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-300" size={20} />
                <input
                  type="password"
                  placeholder="Sua senha"
                  className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#4C1D95] outline-none transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!modoRecuperar}
                  tabIndex={!modoRecuperar ? 0 : -1}
                />
              </div>
            </div>

            {/* Esqueci minha senha (só aparece no modo login) */}
            {!isSignUp && !modoRecuperar && (
              <div className="text-right !mt-2">
                <button
                  type="button"
                  onClick={() => setModoRecuperar(true)}
                  className="text-xs font-bold text-gray-400 hover:text-[#4C1D95] transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#5B21B6] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : modoRecuperar ? (
                <><Mail size={20} /> Enviar link de recuperação</>
              ) : isSignUp ? (
                <><UserPlus size={20} /> Criar Conta</>
              ) : (
                <><LogIn size={20} /> Entrar no App</>
              )}
            </button>
          </form>

          {modoRecuperar ? (
            <button
              onClick={() => setModoRecuperar(false)}
              className="w-full mt-6 text-sm font-bold text-[#4C1D95] hover:underline"
            >
              Voltar para o login
            </button>
          ) : (
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full mt-6 text-sm font-bold text-[#4C1D95] hover:underline"
            >
              {isSignUp ? 'Já tem uma conta? Entrar' : 'Novo por aqui? Criar conta agora'}
            </button>
          )}
        </div>

        <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[4px]">
          Por @ojefersonrocha • Verbo
        </p>
      </div>
    </div>
  );
};

export default Login;