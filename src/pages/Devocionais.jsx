import React from 'react';
import { Sparkles, Quote } from 'lucide-react';

const Devocionais = () => {
  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto bg-[#FDFDFF] min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-black text-[#0F172A] mb-1">Devocionais</h1>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#5B2DFF]" />
          <span className="text-[10px] font-extrabold text-[#5B2DFF] uppercase tracking-widest">
            Insights para Pregadores
          </span>
        </div>
      </header>

      <div className="relative bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5B2DFF] to-[#D946EF]"></div>
        
        <div className="flex justify-between items-start mb-6">
          <span className="bg-purple-50 text-[#5B2DFF] text-[10px] font-bold px-3 py-1 rounded-full">
            FEVEREIRO 2026
          </span>
          <Quote size={40} className="text-purple-50" />
        </div>

        <div className="prose">
          <h3 className="text-xl font-bold text-slate-800 mb-4">📖 Provérbios 3:5</h3>
          <p className="text-lg text-slate-600 leading-relaxed italic font-serif">
            "Confie no Senhor de todo o seu coração". Lembre-se, Jeferson: a pregação que toca o coração do povo é aquela que primeiro queimou no coração do pregador.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Devocionais;