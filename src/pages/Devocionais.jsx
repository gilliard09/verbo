import React from 'react';
import { Sparkles, Quote } from 'lucide-react';

const Devocional = () => {
  return (
    <div className="p-6 pb-24 max-w-4xl mx-auto bg-[#FDFDFF] min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-[#0F172A] mb-1">Devocionais</h1>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#5B2DFF]" />
          <span className="text-[10px] font-extrabold text-[#5B2DFF] uppercase tracking-widest">
            Insights Teológicos Diários
          </span>
        </div>
      </header>

      <div className="relative bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 overflow-hidden">
        {/* Detalhe Roxo no Topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5B2DFF] to-[#D946EF]"></div>
        
        <div className="flex justify-between items-start mb-6">
          <span className="bg-purple-50 text-[#5B2DFF] text-[10px] font-bold px-3 py-1 rounded-full uppercase">
            Hoje • 12/02/2026
          </span>
          <Quote size={40} className="text-purple-50" />
        </div>

        <div className="prose prose-slate">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            📖 *Provérbios 3:5-6*
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed italic font-serif">
            "Confie no Senhor de todo o seu coração". Como ensinava Charles Spurgeon, a soberania de Deus é o travesseiro onde o cristão descansa a cabeça. John Piper nos lembra que a alegria no Senhor é nossa força. Que sua caminhada hoje seja guiada não pela sua prudência, mas pela dependência total do Espírito.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Devocional;