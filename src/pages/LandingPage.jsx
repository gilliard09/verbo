import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, PenTool, CheckCircle2, ChevronRight, AlertCircle, ShieldCheck, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  // Função de navegação segura para evitar quebra de contexto no deploy
  const handleNavigation = (path) => {
    try {
      navigate(path);
    } catch (error) {
      console.error("Erro na navegação:", error);
      window.location.href = path; // Fallback para navegação tradicional se o router falhar
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 overflow-x-hidden font-sans">
      
      {/* HEADER / NAV */}
      <nav className="flex justify-between items-center px-6 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          {/* Logo com proteção contra erro de carregamento */}
          <img 
            src="/logo.png" 
            alt="Logo O Verbo" 
            className="w-10 h-10 object-contain rounded-xl" 
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = "https://ui-avatars.com/api/?name=V&background=4C1D95&color=fff"; // Fallback visual
            }}
          />
          <span className="font-black tracking-tighter text-xl uppercase">
             <span className="text-[#4C1D95]">VERBO</span>
          </span>
        </div>
        <button 
          onClick={() => handleNavigation('/login')}
          className="text-sm font-bold text-[#4C1D95] border border-purple-100 px-6 py-2 rounded-full hover:bg-purple-50 transition-all cursor-pointer"
        >
          Entrar
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="px-6 pt-12 pb-16 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full mb-8">
          <Sparkles size={14} className="text-[#4C1D95]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4C1D95]">Tecnologia que serve à Palavra</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-8">
          Pare de improvisar <br className="hidden md:block" />
          seus <span className="text-[#4C1D95]">sermões.</span>
        </h1>
        
        <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Organize, estruture e pregue com clareza — em um só lugar. O app que todo pregador precisa para preparar mensagens com profundidade e segurança.
        </p>

        <div className="flex flex-col items-center justify-center gap-6">
          <button 
            onClick={() => handleNavigation('/login')}
            className="w-full md:w-auto bg-[#4C1D95] text-white px-10 py-6 rounded-[28px] font-black shadow-2xl shadow-purple-200 hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg cursor-pointer"
          >
            CRIAR MINHA CONTA GRÁTIS AGORA <ChevronRight size={22}/>
          </button>
          
          <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Gratuito</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Sem Cartão</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Início em 1 min</span>
          </div>
        </div>
      </section>

      {/* VÍDEO SECTION */}
      <section className="px-6 py-6 max-w-5xl mx-auto">
        <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-[8px] border-white bg-slate-900 aspect-video">
          <iframe 
            className="w-full h-full"
            src="https://www.youtube.com/embed/6NoH4hnYtFM" 
            title="Apresentação O Verbo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
      </section>

      {/* DOR VS SOLUÇÃO */}
      <section className="px-6 py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[48px] p-8 md:p-16 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black mb-10 text-center tracking-tight">Você já passou por isso?</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {[
                "Travar na hora de montar o esboço",
                "Ter dezenas de anotações espalhadas",
                "Esquecer pontos importantes no púlpito",
                "Deixar o sermão para a última hora"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-red-50/50 rounded-2xl">
                  <AlertCircle className="text-red-400 shrink-0" size={20} />
                  <p className="font-bold text-slate-700 text-sm">{item}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-block bg-[#4C1D95] text-white px-8 py-4 rounded-3xl font-black text-xl mb-4 shadow-xl shadow-purple-100">
                O VERBO RESOLVE ISSO.
              </div>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-4">
                Simplicidade para quem prega. Tecnologia para quem ensina.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AUTORIDADE E DIFERENCIAL */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#4C1D95] font-black text-[10px] uppercase tracking-[0.2em] mb-4 block">Autoridade e Prática</span>
            <h2 className="text-4xl font-black tracking-tighter mb-6 leading-tight">
              Criado por quem ensina <br/>pregação e teologia na prática.
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Jeferson Rocha é Pastor, Professor de Teologia e Diretor da Tecnologge cursos. Este ecossistema foi desenhado para unir formação ministerial, IA e tecnologia de ponta.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <Users className="text-[#4C1D95]" />
                <p className="font-black text-sm text-slate-700">Ecossistema integrado com turmas e formação</p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <ShieldCheck className="text-[#4C1D95]" />
                <p className="font-black text-sm text-slate-700">Segurança total para seus esboços e estudos</p>
              </div>
            </div>
          </div>

          <div className="bg-[#4C1D95] rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <h3 className="text-3xl font-black mb-6 italic leading-tight text-center">“Mais de 120 sermões criados nas últimas 2 semanas por alunos!”</h3>
            <p className="text-shadow-purple-100 text-center font-bold uppercase text-[10px] tracking-widest">Prova social • Verbo app</p>
            <div className="mt-8 pt-8 border-t border-white/10 flex justify-center gap-2">
              {[1,2,3,4,5].map(i => <Sparkles key={i} size={16} className="text-yellow-400 fill-yellow-400" />)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-[48px] p-12 text-center relative overflow-hidden shadow-3xl">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4C1D95] opacity-20 blur-[100px]"></div>
          <h2 className="text-white text-3xl md:text-5xl font-black mb-8 tracking-tighter italic">O app que todo pregador precisa.</h2>
          <button 
            onClick={() => handleNavigation('/login')}
            className="bg-white text-slate-900 px-12 py-6 rounded-3xl font-black hover:scale-105 transition-all text-lg shadow-xl cursor-pointer"
          >
            QUERO COMEÇAR AGORA
          </button>
        </div>
      </section>

      <footer className="py-12 text-center border-t border-gray-100">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          © 2026 O VERBO • Pr. Jeferson Rocha
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;