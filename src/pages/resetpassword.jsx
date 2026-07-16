import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, KeyRound, AlertCircle, CheckCircle2, X, ShieldCheck } from 'lucide-react';

// Traduz as mensagens mais comuns do Supabase Auth para português
const traduzirErro = (mensagem = '') => {
  const m = mensagem.toLowerCase();
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('same password') || m.includes('should be different')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante e tente novamente.';
  if (m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  if (m.includes('expired') || m.includes('invalid')) return 'Este link expirou ou já foi usado. Solicite um novo.';
  return 'Algo deu errado. Tente novamente em instantes.';
};

// ─── Banner de feedback ──────────────────────────────────────────────────
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
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Fechar aviso">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [prontoParaRedefinir, setProntoParaRedefinir] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [feedback, setFeedback] = useState({ tipo: null, mensagem: '' });
  const [concluido, setConcluido] = useState(false);

  // O Supabase captura o token do link de e-mail automaticamente e dispara
  // o evento PASSWORD_RECOVERY quando a sessão temporária de recuperação está pronta.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setProntoParaRedefinir(true);
        setVerificando(false);
      }
    });

    // Fallback: se já existir sessão válida ao carregar (ex: recarregou a página
    // depois de clicar no link), libera o formulário também.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setProntoParaRedefinir(true);
      }
      setVerificando(false);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleRedefinir = async (e) => {
    e.preventDefault();
    setFeedback({ tipo: null, mensagem: '' });

    if (password.length < 6) {
      setFeedback({ tipo: 'erro', mensagem: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    if (password !== confirmarPassword) {
      setFeedback({ tipo: 'erro', mensagem: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setConcluido(true);
      setFeedback({ tipo: 'sucesso', mensagem: 'Senha redefinida com sucesso!' });
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
      `}</style>

      <div className="login-glow absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* LOGO */}
        <div className="mb-10 text-center">
          <div className="w-32 h-32 mx-auto mb-4 drop-shadow-xl overflow-hidden rounded-[32px]">
            <img
              src="/logo.png?v=1"
              alt="Logo Verbo"
              className="w-full h-full object-contain"
              style={{ display: 'block' }}
              onError={(e) => {
                e.target.src = 'https://ui-avatars.com/api/?name=Verbo&background=4C1D95&color=fff&size=128';
              }}
            />
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tighter uppercase italic">
            Verbo
          </h1>
          <p className="text-gray-400 text-sm font-medium">O Verbo nasce da Palavra</p>
        </div>

        {/* CARD */}
        <div className="w-full max-w-sm bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">

          {/* Estado 1: verificando o link */}
          {verificando && (
            <div className="text-center py-6">
              <div className="animate-spin h-8 w-8 border-2 border-[#4C1D95] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400 text-sm font-medium">Verificando seu link de recuperação...</p>
            </div>
          )}

          {/* Estado 2: link inválido/expirado */}
          {!verificando && !prontoParaRedefinir && !concluido && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={26} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Link inválido ou expirado</h2>
              <p className="text-gray-400 text-sm font-medium mb-6 leading-relaxed">
                Esse link de recuperação não é mais válido. Volte para o login e solicite um novo.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#5B21B6] transition-all active:scale-95"
              >
                Voltar para o login
              </button>
            </div>
          )}

          {/* Estado 3: senha redefinida com sucesso */}
          {concluido && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={26} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Senha atualizada!</h2>
              <p className="text-gray-400 text-sm font-medium mb-6 leading-relaxed">
                Sua senha foi redefinida com sucesso. Você já pode entrar com ela.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#5B21B6] transition-all active:scale-95"
              >
                Ir para o login
              </button>
            </div>
          )}

          {/* Estado 4: formulário de nova senha */}
          {!verificando && prontoParaRedefinir && !concluido && (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">Criar nova senha</h2>
              <p className="text-gray-400 text-xs font-medium text-center mb-6">
                Escolha uma senha forte para proteger sua conta.
              </p>

              <FeedbackBanner
                tipo={feedback.tipo}
                mensagem={feedback.mensagem}
                onClose={() => setFeedback({ tipo: null, mensagem: '' })}
              />

              <form onSubmit={handleRedefinir} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-300" size={20} />
                  <input
                    type="password"
                    placeholder="Nova senha"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#4C1D95] outline-none transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 text-gray-300" size={20} />
                  <input
                    type="password"
                    placeholder="Confirme a nova senha"
                    className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#4C1D95] outline-none transition-all font-medium"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-100 hover:bg-[#5B21B6] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <><ShieldCheck size={20} /> Redefinir senha</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-12 text-[10px] text-gray-300 font-bold uppercase tracking-[4px]">
          Por @ojefersonrocha • Verbo
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;