// pages/Upgrade.jsx
// Tela de planos — exibida quando usuário tenta ação bloqueada ou acessa /upgrade
// Props opcionais: motivo ('limite_sermoes' | 'academia' | null)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlano } from '../hooks/usePlano';
import {
  CheckCircle2, Sparkles, Crown, ArrowLeft,
  BookOpen, Mic2, WifiOff, Infinity, Star, Zap, GraduationCap
} from 'lucide-react';

// ─── Preencha com os links de checkout da Hotmart ────────────────────────────
const CHECKOUT_FUNDADOR = 'https://pay.hotmart.com/Q104834422F';
const CHECKOUT_PLUS     = 'https://pay.hotmart.com/W104834540U';

// ─── Benefícios por plano ─────────────────────────────────────────────────────
const BENEFICIOS_FUNDADOR = [
  { icon: Infinity,       texto: 'Sermões ilimitados' },
  { icon: GraduationCap,  texto: 'Curso para Pregadores — incluso' },
  { icon: Mic2,           texto: 'Modo púlpito sem restrições' },
  { icon: WifiOff,        texto: 'Acesso offline ilimitado' },
];

const BENEFICIOS_PLUS = [
  { icon: Infinity,       texto: 'Sermões ilimitados' },
  { icon: BookOpen,       texto: 'Academia Verbo completa — todos os cursos' },
  { icon: GraduationCap,  texto: 'Curso para Pregadores + Teologia Completa' },
  { icon: Mic2,           texto: 'Modo púlpito sem restrições' },
  { icon: WifiOff,        texto: 'Acesso offline ilimitado' },
  { icon: Sparkles,       texto: 'Todas as features futuras incluídas' },
  { icon: Star,           texto: 'Suporte prioritário' },
];

const MOTIVOS = {
  limite_sermoes: { emoji: '📝', texto: 'Você atingiu o limite de 50 sermões do plano gratuito.' },
  academia:       { emoji: '🎓', texto: 'A Academia Verbo é exclusiva para assinantes.' },
};

const Upgrade = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const motivo = searchParams.get('motivo');
  const { plano, isFundador, isPlus, isAssinante } = usePlano();
  const [planoSelecionado, setPlanoSelecionado] = useState('plus');
  const [emailUsuario, setEmailUsuario] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmailUsuario(data.user.email);
    });
  }, []);

  // Já é Plus — tela completa
  if (isPlus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <CheckCircle2 size={48} className="text-green-500" />
        <h2 className="font-black text-xl text-slate-800">Você já é assinante Plus!</h2>
        <button onClick={() => navigate('/')} className="text-[#5B2DFF] font-bold text-sm">
          Voltar para o início
        </button>
      </div>
    );
  }

  // Já é Fundador — só mostra opção de upgrade para Plus
  if (isFundador) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap');`}</style>
        <div className="flex items-center px-5 py-5 border-b border-slate-100 bg-white">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-700">
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest text-slate-800 pr-8">
            Upgrade de plano
          </h1>
        </div>
        <div className="max-w-md mx-auto px-5 pt-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full mb-4">
              <Crown size={13} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Você é Fundador</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-tight mb-2">
              Quer acesso a<br />todos os cursos?
            </h2>
            <p className="text-gray-400 text-sm">Faça upgrade para o Plus e libere toda a Academia.</p>
          </div>

          {/* Diferencial Plus vs Fundador */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 mb-8 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">O que você ganha a mais</p>
            {[
              'Teologia Completa (R$97 avulso)',
              'Todos os cursos futuros da Academia',
              'Suporte prioritário',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 size={11} className="text-green-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => { const url = emailUsuario ? `${CHECKOUT_PLUS}?email=${encodeURIComponent(emailUsuario)}` : CHECKOUT_PLUS; window.open(url, '_blank'); }}
            className="w-full bg-[#5B2DFF] text-white py-5 rounded-[24px] font-black text-base shadow-xl shadow-purple-200 hover:bg-[#4a22e0] active:scale-95 transition-all flex items-center justify-center gap-2 mb-4"
          >
            <Sparkles size={18} /> FAZER UPGRADE — R$47/mês
          </button>
          <button onClick={() => navigate('/')} className="w-full text-center text-xs text-slate-400 font-bold py-3 hover:text-slate-600 transition-colors">
            Continuar com o plano Fundador
          </button>
        </div>
      </div>
    );
  }

  // ─── Tela principal — usuário gratuito ───────────────────────────────────────
  const beneficiosAtivos = planoSelecionado === 'fundador' ? BENEFICIOS_FUNDADOR : BENEFICIOS_PLUS;

  const irParaCheckout = () => {
    const base = planoSelecionado === 'fundador' ? CHECKOUT_FUNDADOR : CHECKOUT_PLUS;
    const url = emailUsuario ? `${base}?email=${encodeURIComponent(emailUsuario)}` : base;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-12" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center px-5 py-5 border-b border-slate-100 bg-white">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest text-slate-800 pr-8">
          Escolha seu plano
        </h1>
      </div>

      <div className="max-w-md mx-auto px-5 pt-8">

        {/* Banner de motivo */}
        {motivo && MOTIVOS[motivo] && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <span className="text-xl">{MOTIVOS[motivo].emoji}</span>
            <p className="text-sm font-semibold text-amber-800">{MOTIVOS[motivo].texto}</p>
          </div>
        )}

        {/* Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full mb-4">
            <Sparkles size={13} className="text-[#5B2DFF]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#5B2DFF]">Desbloqueie tudo</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight mb-2">
            Pregue sem limites<br />com o Verbo.
          </h2>
          <p className="text-gray-400 text-sm">Escolha o plano ideal para sua jornada ministerial.</p>
        </div>

        {/* Seletor de planos */}
        <div className="space-y-3 mb-6">

          {/* Plano FUNDADOR */}
          <button
            onClick={() => setPlanoSelecionado('fundador')}
            className={`w-full text-left p-5 rounded-[24px] border-2 transition-all relative overflow-hidden ${
              planoSelecionado === 'fundador' ? 'border-[#5B2DFF] bg-purple-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="absolute top-4 right-4 bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
              <Crown size={9} /> Fundador
            </div>
            <div className="flex items-start gap-3 pr-20">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${planoSelecionado === 'fundador' ? 'border-[#5B2DFF] bg-[#5B2DFF]' : 'border-slate-300'}`}>
                {planoSelecionado === 'fundador' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div>
                <p className="font-black text-slate-800">Plano Fundador</p>
                <p className="text-[11px] text-gray-400 mt-0.5">App completo + Curso para Pregadores incluso.</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-black text-[#5B2DFF]">R$9,90</span>
                  <span className="text-xs text-gray-400 font-bold">/mês para sempre</span>
                </div>
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Vagas limitadas</p>
              </div>
            </div>
          </button>

          {/* Plano PLUS */}
          <button
            onClick={() => setPlanoSelecionado('plus')}
            className={`w-full text-left p-5 rounded-[24px] border-2 transition-all relative overflow-hidden ${
              planoSelecionado === 'plus' ? 'border-[#5B2DFF] bg-purple-50' : 'border-slate-200 bg-white'
            }`}
          >
            {/* Badge "mais popular" */}
            <div className="absolute top-4 right-4 bg-[#5B2DFF] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap size={9} /> Mais completo
            </div>
            <div className="flex items-start gap-3 pr-24">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${planoSelecionado === 'plus' ? 'border-[#5B2DFF] bg-[#5B2DFF]' : 'border-slate-300'}`}>
                {planoSelecionado === 'plus' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div>
                <p className="font-black text-slate-800">Plano Plus</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Todos os cursos da Academia + app completo.</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-black text-[#5B2DFF]">R$47</span>
                  <span className="text-xs text-gray-400 font-bold">/mês</span>
                </div>
                <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Zap size={9} /> Cancele quando quiser
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Benefícios do plano selecionado */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-5 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Incluído no plano {planoSelecionado === 'fundador' ? 'Fundador' : 'Plus'}
          </p>
          <div className="space-y-3">
            {beneficiosAtivos.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <b.icon size={14} className="text-[#5B2DFF]" />
                </div>
                <p className="text-sm font-semibold text-slate-700">{b.texto}</p>
              </div>
            ))}
          </div>
          {/* Comparativo quando Fundador está selecionado */}
          {planoSelecionado === 'fundador' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold">
                ✦ Para acesso a <span className="text-[#5B2DFF]">todos os cursos</span>, escolha o Plano Plus.
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={irParaCheckout}
          className="w-full bg-[#5B2DFF] text-white py-5 rounded-[24px] font-black text-base shadow-xl shadow-purple-200 hover:bg-[#4a22e0] active:scale-95 transition-all flex items-center justify-center gap-2 mb-4"
        >
          <Sparkles size={18} />
          {planoSelecionado === 'fundador' ? 'GARANTIR PREÇO FUNDADOR — R$9,90/mês' : 'ASSINAR AGORA — R$47/mês'}
        </button>

        <div className="flex justify-center gap-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Pagamento seguro</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Hotmart</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Cancele fácil</span>
        </div>

        <button onClick={() => navigate('/')} className="w-full text-center text-xs text-slate-400 font-bold py-3 hover:text-slate-600 transition-colors">
          Continuar com o plano gratuito (50 sermões)
        </button>
      </div>
    </div>
  );
};

export default Upgrade;