import { useNavigate } from 'react-router-dom';
import { BookOpen, Flame, Heart } from 'lucide-react';

const NovoSermao = () => {
  const navigate = useNavigate();

  const criarSermao = (tipo) => {
    // você pode passar o tipo como query ou state
    navigate(`/editor?tipo=${tipo}`);
  }; 

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center px-6 text-center">

      {/* Headline */}
      <h1 className="text-2xl font-black text-slate-800 leading-tight mb-3">
        Como você quer começar?
      </h1>

      {/* Subtexto */}
      <p className="text-gray-400 text-sm mb-10 max-w-xs">
        Escolha um formato e o Verbo te guia passo a passo.
      </p>

      {/* Opções */}
      <div className="w-full max-w-sm space-y-4">

        {/* Expositivo */}
        <button
          onClick={() => criarSermao('expositivo')}
          className="w-full bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#5B2DFF]">
            <BookOpen size={22} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-700 text-sm">
              Sermão Expositivo
            </h3>
            <p className="text-[11px] text-gray-400">
              Baseado em um texto bíblico
            </p>
          </div>
        </button>

        {/* Temático */}
        <button
          onClick={() => criarSermao('tematico')}
          className="w-full bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
            <Flame size={22} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-700 text-sm">
              Sermão Temático
            </h3>
            <p className="text-[11px] text-gray-400">
              Desenvolva de um tema central
            </p>
          </div>
        </button>

        {/* Devocional */}
        <button
          onClick={() => criarSermao('devocional')}
          className="w-full bg-white border border-gray-100 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
            <Heart size={22} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-700 text-sm">
              Devocional
            </h3>
            <p className="text-[11px] text-gray-400">
              Mensagem prática e objetiva
            </p>
          </div>
        </button>

      </div>

      {/* Rodapé leve */}
      <p className="text-[11px] text-gray-300 mt-10">
        Você pode editar tudo depois
      </p>

    </div>
  );
};

export default NovoSermao;