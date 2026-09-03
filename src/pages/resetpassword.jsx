import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, KeyRound, AlertCircle, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { track } from '../lib/analytics';

// Traduz as mensagens mais comuns do Supabase Auth para português
const traduzirErro = (mensagem = '') => {
  const m = mensagem.toLowerCase();
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('same password') || m.includes('should be different')) return 'A nova senha precisa ser diferente da atual.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante e tente novamente.';
  if (m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  if (m.includes('expired') || m.includes('invalid')) return 'Este link expirou ou já foi usado. Solicite um novo.';
  if (m.includes('invalid otp') || m.includes('invalid token')) return 'Código inválido. Verifique o link e tente novamente.';
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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [prontoParaRedefinir, setProntoParaRedefinir] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [feedback, setFeedback] = useState({ tipo: null, mensagem: '' });
  const [concluido, setConcluido] = useState(false);

  // Extrai o token da URL e verifica se é válido
  useEffect(() => {
    const verificarToken = async () => {
      try {
        // Extrai token e type da query string
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        console.log('🔍 Verificando reset de senha...');
        console.log('Token da URL:', token ? `✓ Encontrado (${token.length} caracteres)` : '✗ Não encontrado');
        console.log('Type:', type);

        // Se não houver token, link é inválido
        if (!token) {
          console.error('❌ Nenhum token encontrado na URL');
          setVerificando(false);
          setFeedback({ tipo: 'erro', mensagem: traduzirErro('invalid token') });
          return;
        }

        // Log: qual é o tamanho do token?
        if (token.length < 20) {
          console.warn('⚠️ Token parece muito curto:', token.length, 'caracteres');
        }

        // ✅ Para password recovery, usar verifyOtp
        // Mas o problema é: verifyOtp precisa do email, que não temos na URL
        // Solução: Tentar fazer login com o token direto via exchangeCodeForSession
        
        console.log('Tentando validar token com exchangeCodeForSession...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(token);

        if (error) {
          console.error('❌ Erro ao validar token com exchangeCodeForSession:', error.message);
          
          // Se falhar, tentar verifyOtp como fallback
          console.log('Tentando fallback com verifyOtp (sem email)...');
          const { error: otpError } = await supabase.auth.verifyOtp({
            token: token,
            type: type || 'recovery',
          });

          if (otpError) {
            console.error('❌ Fallback também falhou:', otpError.message);
            setVerificando(false);
            setFeedback({ tipo: 'erro', mensagem: traduzirErro(otpError.message) });
            return;
          }
        }

        if (data?.session) {
          console.log('✓ Sessão estabelecida com sucesso');
          setProntoParaRedefinir(true);
          setTokenValido(true);
          setVerificando(false);
        } else if (!error) {
          // verifyOtp funcionou sem sessão
          console.log('✓ Token validado (sem sessão estabelecida)');
          setTokenValido(true);
          setProntoParaRedefinir(true);
          setVerificando(false);
        }

        track('password_reset_link_verified');

      } catch (error) {
        console.error('❌ Erro durante verificação:', error);
        setVerificando(false);
        setFeedback({ tipo: 'erro', mensagem: traduzirErro(error.message) });
      }
    };

    verificarToken();
  }, [searchParams]);

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
      // ✅ Agora o updateUser deve funcionar porque o token foi validado
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      track('password_reset_completed');
      setConcluido(true);
      setFeedback({ tipo: 'sucesso', mensagem: 'Senha redefinida com sucesso!' });

      // Redireciona para login após 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
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
                    <>
                      <ShieldCheck size={20} /> Redefinir senha
                    </>
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