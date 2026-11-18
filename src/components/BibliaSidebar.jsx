import React, { useState } from 'react';
import { X, Search, BookOpen, Copy, Loader2 } from 'lucide-react';

const API_BIBLIA = 'https://api.midvash.com/v1';
const VERSAO_BIBLIA = 'almeida-livre';

const BibliaSidebar = ({ isOpen, onClose }) => {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const pesquisarBiblia = async (e) => {
    e.preventDefault();
    const referencia = busca.trim();
    if (!referencia || loading) return;

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      // Primeiro interpreta a referência em português (ex.: João 3:16 ou Sl 23).
      const params = new URLSearchParams({ q: referencia, version: VERSAO_BIBLIA });
      const parseResponse = await fetch(`${API_BIBLIA}/parse?${params.toString()}`);
      const parseJson = await parseResponse.json();

      if (!parseResponse.ok || !parseJson.data) {
        throw new Error(parseJson.error?.message || 'Referência não encontrada. Confira o livro, capítulo e versículo.');
      }

      const parsed = parseJson.data;
      const versiculos = parsed.verse_start == null
        ? ''
        : `/${parsed.verse_start}${parsed.verse_end && parsed.verse_end !== parsed.verse_start ? `-${parsed.verse_end}` : ''}`;
      const urlTexto = `${API_BIBLIA}/${VERSAO_BIBLIA}/${encodeURIComponent(parsed.book_slug)}/${parsed.chapter}${versiculos}`;

      const textoResponse = await fetch(urlTexto);
      const textoJson = await textoResponse.json();

      if (!textoResponse.ok || !textoJson.data?.text) {
        throw new Error(textoJson.error?.message || 'Não foi possível carregar esse trecho bíblico.');
      }

      setResultado({
        reference: textoJson.meta?.reference || referencia,
        text: textoJson.data.text,
        copyright: textoJson.meta?.copyright || '',
      });
    } catch (error) {
      console.error('Erro ao buscar Bíblia:', error);
      setErro(error.message || 'Não foi possível consultar a Bíblia agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copiarTexto = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(`${resultado.text.trim()} (${resultado.reference})`);
      alert('Versículo copiado para o sermão!');
    } catch (error) {
      console.error('Erro ao copiar texto bíblico:', error);
      setErro('Não foi possível copiar. Verifique a permissão da área de transferência.');
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-[101] shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-[#4C1D95]">
              <BookOpen size={24} />
              <h2 className="font-black uppercase tracking-tighter">Bíblia Rápida</h2>
            </div>
            <button onClick={onClose} aria-label="Fechar Bíblia Rápida" className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={pesquisarBiblia} className="relative mb-6">
            <input
              type="text"
              placeholder="Ex: João 3:16 ou Sl 23"
              aria-label="Referência bíblica"
              className="w-full p-4 pr-12 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 ring-purple-100"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button type="submit" disabled={loading || !busca.trim()} aria-label="Pesquisar referência" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4C1D95] disabled:opacity-40">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <Loader2 size={28} className="animate-spin mb-3 text-[#4C1D95]" />
                <p className="text-xs font-bold">Consultando as Escrituras...</p>
              </div>
            ) : erro ? (
              <div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {erro}
              </div>
            ) : resultado ? (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start mb-4 gap-3">
                  <h3 className="font-black text-[#4C1D95] text-xl">{resultado.reference}</h3>
                  <button onClick={copiarTexto} aria-label="Copiar texto bíblico" className="p-2 text-gray-400 hover:text-[#4C1D95] transition-colors">
                    <Copy size={18} />
                  </button>
                </div>
                <p className="text-slate-600 leading-relaxed font-serif text-lg italic whitespace-pre-line">
                  "{resultado.text.trim()}"
                </p>
                {resultado.copyright && (
                  <p className="mt-5 text-[10px] leading-relaxed text-slate-400">{resultado.copyright}</p>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                <BookOpen size={48} className="mb-4" />
                <p className="text-xs font-black uppercase">Pesquise uma referência<br />para leitura rápida.</p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
              Bíblia Rápida • Verbo app
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BibliaSidebar;
