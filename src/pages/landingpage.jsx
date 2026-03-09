import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenTool, BookOpen, Mic2, BookMarked, Brain, WifiOff,
  CheckCircle2, ChevronRight, AlertCircle, ShieldCheck,
  Users, Star, Quote, Sparkles, ArrowRight
} from 'lucide-react';

// ─── Dados ───────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: PenTool,
    titulo: 'Editor de Sermões',
    desc: 'Escreva, formate e organize seus esboços com negrito, citações e destaques. Auto-save automático.',
  },
  {
    icon: Mic2,
    titulo: 'Modo Púlpito',
    desc: 'Leitura em tela cheia com fonte ajustável, temas claro/sépia/escuro e tela que não apaga.',
  },
  {
    icon: BookMarked,
    titulo: 'Bíblia Integrada',
    desc: 'Acesse as Escrituras sem sair do app. Consulte referências direto na lateral enquanto escreve.',
  },
  {
    icon: BookOpen,
    titulo: 'Academia Verbo',
    desc: 'Cursos de teologia e pregação com progresso salvo. Formação ministerial descomplicada.',
  },
  {
    icon: WifiOff,
    titulo: 'Acesso Offline',
    desc: 'Salve seus sermões para pregar sem internet. Funciona mesmo em locais sem sinal.',
  },
  {
    icon: Brain,
    titulo: 'Organização Total',
    desc: 'Todos os seus sermões em um só lugar, com título, referência bíblica e histórico de versões.',
  },
];

const DEPOIMENTOS = [
  {
    texto: 'Paz pastor adorei o aplicativo do verbo, nossa bem prático, fácil, muito bom mesmo. A gente tem a liberdade de escrever como a gente quiser sem problema nenhum para escrever a mensagem.',
    nome: 'Jayne',
    local: 'Garuva / SC',
    img: '/depoimento-jayne.jpg',
    stars: 5,
  },
  {
    texto: 'Bonito e integralizado, boa aparência, fácil manuseio e objetivo!',
    nome: 'Michel',
    local: 'São Paulo / SP',
    img: '/depoimento-michel.jpg',
    stars: 5,
  },
];

const DORES = [
  'Travar na hora de montar o esboço',
  'Ter dezenas de anotações espalhadas',
  'Esquecer pontos importantes no púlpito',
  'Deixar o sermão para a última hora',
];

// ─── Componente ───────────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [visivel, setVisivel] = useState({});

  const handleNavigation = (path) => {
    try { navigate(path); }
    catch { window.location.href = path; }
  };

  // Animação de entrada por seção
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setVisivel(prev => ({ ...prev, [e.target.dataset.section]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const anim = (key, delay = 0) => ({
    style: {
      opacity: visivel[key] ? 1 : 0,
      transform: visivel[key] ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;0,900;1,700;1,900&display=swap');
        * { font-family: 'Poppins', sans-serif; }
        .grain { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); }
        .hero-glow { background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(76,29,149,0.12) 0%, transparent 70%); }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(76,29,149,0.10); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation: float 4s ease-in-out infinite; }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        .pulse-ring::after { content:''; position:absolute; inset:-6px; border-radius:50%; border:2px solid #4C1D95; animation:pulse-ring 2s ease-out infinite; }
      `}</style>

      {/* ── NAV ── */}
      <nav className="flex justify-between items-center px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Verbo"
            className="w-9 h-9 object-contain rounded-xl"
            onError={e => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=V&background=4C1D95&color=fff"; }}
          />
          <span className="font-black tracking-tighter text-xl text-[#4C1D95] uppercase">Verbo</span>
        </div>
        <button
          onClick={() => handleNavigation('/login')}
          className="text-sm font-bold text-[#4C1D95] border border-purple-200 px-5 py-2 rounded-full hover:bg-purple-50 transition-all"
        >
          Entrar
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-glow px-6 pt-10 pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 px-4 py-2 rounded-full mb-8">
          <Sparkles size={13} className="text-[#4C1D95]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4C1D95]">Tecnologia que serve à Palavra</span>
        </div>

        <h1 className="font-black tracking-tighter leading-[1.0] mb-6 text-slate-900"
          style={{ fontSize: 'clamp(2.4rem, 8vw, 5.5rem)' }}>
          Pare de improvisar<br />
          seus <span className="text-[#4C1D95] italic">sermões.</span>
        </h1>

        <p className="text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed font-medium"
          style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)' }}>
          Organize, estruture e pregue com clareza — em um só lugar. O app que todo pregador precisa para preparar mensagens com profundidade e segurança.
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => handleNavigation('/login')}
            className="w-full max-w-sm bg-[#4C1D95] text-white px-8 py-5 rounded-[24px] font-black shadow-xl shadow-purple-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
          >
            CRIAR MINHA CONTA GRÁTIS <ChevronRight size={20} />
          </button>
          <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Gratuito</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Sem cartão</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Início em 1 min</span>
          </div>
        </div>
      </section>

      {/* ── DOR vs SOLUÇÃO ── */}
      <section className="px-6 py-20 bg-white" data-section="dor">
        <div className="max-w-3xl mx-auto">
          <div {...anim('dor', 0)}>
            <h2 className="text-3xl font-black mb-2 tracking-tight text-center">Você já passou por isso?</h2>
            <p className="text-center text-gray-400 text-sm mb-10 font-medium">Problemas reais de quem prega toda semana.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {DORES.map((item, i) => (
              <div key={i} {...anim('dor', 100 + i * 80)} className="flex items-start gap-3 p-4 bg-red-50/60 border border-red-100 rounded-2xl">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="font-semibold text-slate-700 text-sm">{item}</p>
              </div>
            ))}
          </div>
          <div {...anim('dor', 500)} className="text-center">
            <div className="inline-block bg-[#4C1D95] text-white px-8 py-4 rounded-3xl font-black text-xl shadow-xl shadow-purple-100">
              O VERBO RESOLVE ISSO.
            </div>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-5">
              Simplicidade para quem prega. Tecnologia para quem ensina.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto" data-section="features">
        <div {...anim('features', 0)} className="text-center mb-14">
          <span className="text-[#4C1D95] font-black text-[10px] uppercase tracking-[0.2em] mb-3 block">O que você encontra no app</span>
          <h2 className="text-4xl font-black tracking-tighter">Tudo que você precisa<br />para pregar bem.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              {...anim('features', 100 + i * 80)}
              className="card-hover bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
                <f.icon size={22} className="text-[#4C1D95]" />
              </div>
              <h3 className="font-black text-slate-800 mb-2 text-sm tracking-tight">{f.titulo}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VÍDEO (reposicionado após features) ── */}
      <section className="px-6 pb-24 max-w-4xl mx-auto" data-section="video">
        <div {...anim('video', 0)} className="text-center mb-8">
          <span className="text-[#4C1D95] font-black text-[10px] uppercase tracking-[0.2em]">Veja como funciona</span>
          <h2 className="text-3xl font-black tracking-tight mt-2">Em alguns minutos você entende tudo.</h2>
        </div>
        <div {...anim('video', 150)} className="relative rounded-[32px] overflow-hidden shadow-2xl border-4 border-white bg-slate-900 aspect-video">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/6NoH4hnYtFM"
            title="Apresentação O Verbo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* ── AUTORIDADE com foto real ── */}
      <section className="px-6 py-24 bg-white" data-section="autor">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Foto */}
          <div {...anim('autor', 0)} className="flex justify-center">
            <div className="relative">
              <div className="w-64 h-80 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white ring-4 ring-purple-100 float">
                <img
                  src="/pastor-jeferson.jpg"
                  alt="Pastor Jeferson Rocha"
                  className="w-full h-full object-cover object-top"
                  onError={e => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=JR&background=4C1D95&color=fff&size=256"; }}
                />
              </div>
              {/* Badge flutuante */}
              <div className="absolute -bottom-4 -right-4 bg-[#4C1D95] text-white px-4 py-2 rounded-2xl shadow-xl">
                <p className="text-[9px] font-black uppercase tracking-widest">Pastor & Professor</p>
                <p className="text-xs font-black">Jeferson Rocha</p>
              </div>
            </div>
          </div>

          {/* Texto */}
          <div {...anim('autor', 150)}>
            <span className="text-[#4C1D95] font-black text-[10px] uppercase tracking-[0.2em] mb-4 block">Quem criou o Verbo</span>
            <h2 className="text-3xl font-black tracking-tight mb-5 leading-tight">
              Criado por quem ensina pregação e teologia na prática.
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed text-sm">
              Jeferson Rocha é Pastor, Professor de Teologia e Diretor da Tecnologge Cursos. O Verbo nasceu da necessidade real de quem prepara mensagens toda semana — unindo formação ministerial e tecnologia de ponta.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <Users size={18} className="text-[#4C1D95] shrink-0" />
                <p className="font-semibold text-sm text-slate-700">Ecossistema integrado com turmas e formação</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <ShieldCheck size={18} className="text-[#4C1D95] shrink-0" />
                <p className="font-semibold text-sm text-slate-700">Segurança total para seus esboços e estudos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS REAIS ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto" data-section="depoimentos">
        <div {...anim('depoimentos', 0)} className="text-center mb-14">
          <span className="text-[#4C1D95] font-black text-[10px] uppercase tracking-[0.2em] mb-3 block">Prova Social</span>
          <h2 className="text-4xl font-black tracking-tighter">Pregadores que já usam<br />e aprovaram.</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {DEPOIMENTOS.map((d, i) => (
            <div key={i} {...anim('depoimentos', 150 + i * 120)} className="card-hover bg-white border border-slate-100 rounded-[32px] p-7 shadow-sm relative">
              <Quote size={32} className="text-purple-100 absolute top-6 right-7" />
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array(d.stars).fill(0).map((_, j) => (
                  <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium">"{d.texto}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <div className="relative pulse-ring">
                  <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden">
                    <img
                      src={d.img}
                      alt={d.nome}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${d.nome}&background=EDE9FE&color=4C1D95`; }}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{d.nome}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{d.local}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Métrica */}
        <div {...anim('depoimentos', 400)} className="text-center">
          <div className="inline-flex items-center gap-3 bg-purple-50 border border-purple-100 px-6 py-4 rounded-[20px]">
            <Users size={18} className="text-[#4C1D95]" />
            <p className="font-black text-[#4C1D95] text-sm uppercase tracking-tight">+500 acessos nos últimos 7 dias</p>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 py-20" data-section="cta">
        <div {...anim('cta', 0)} className="max-w-3xl mx-auto bg-[#4C1D95] rounded-[48px] p-12 text-center relative overflow-hidden shadow-2xl">
          {/* Decoração */}
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-300 opacity-10 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <Sparkles size={28} className="text-yellow-400 mx-auto mb-6" />
            <h2 className="text-white font-black tracking-tighter mb-4 leading-tight italic"
              style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
              O app que todo pregador<br />precisa.
            </h2>
            <p className="text-purple-200 text-sm mb-8 font-medium">Comece agora. É gratuito, sem cartão de crédito.</p>
            <button
              onClick={() => handleNavigation('/login')}
              className="bg-white text-[#4C1D95] px-10 py-5 rounded-3xl font-black hover:scale-105 active:scale-95 transition-all text-base shadow-xl inline-flex items-center gap-2"
            >
              QUERO COMEÇAR AGORA <ArrowRight size={18} />
            </button>
            <div className="flex justify-center gap-5 mt-6 text-[10px] font-black text-purple-300 uppercase tracking-widest">
              <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Gratuito</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Sem cartão</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Seguro</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 text-center border-t border-gray-100">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          © 2026 O VERBO • Pr. Jeferson Rocha
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;