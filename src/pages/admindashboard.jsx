import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  LayoutGrid, 
  PlayCircle, 
  Save, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Database,
  Tag,
  Loader2,
  Image as ImageIcon,
  ShoppingCart // Adicionei este ícone para o Checkout
} from 'lucide-react';

const AdminDashboard = () => {
  const [aba, setAba] = useState('cursos'); // 'cursos' ou 'aulas'
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ESTADO ATUALIZADO COM CHECKOUT_URL
  const [novoCurso, setNovoCurso] = useState({ 
    titulo: '', 
    descricao: '', 
    capa_url: '', 
    hotmart_id: '',
    checkout_url: '' // Novo campo
  });
  const [novaAula, setNovaAula] = useState({ titulo: '', video_url: '', curso_id: '', ordem: 1 });

  useEffect(() => {
    carregarCursos();
  }, []);

  const carregarCursos = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erro ao carregar cursos:", error.message);
    } else {
      setCursos(data || []);
    }
    setFetching(false);
  };

  const salvarCurso = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('cursos').insert([novoCurso]);
    
    if (!error) {
      alert("Curso criado com sucesso e vinculado ao Checkout!");
      setNovoCurso({ titulo: '', descricao: '', capa_url: '', hotmart_id: '', checkout_url: '' });
      await carregarCursos();
    } else {
      alert("Erro ao criar curso: " + error.message);
    }
    setLoading(false);
  };

  const salvarAula = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aulas').insert([novaAula]);
    
    if (!error) {
      alert("Aula publicada com sucesso!");
      setNovaAula({ ...novaAula, titulo: '', video_url: '', ordem: Number(novaAula.ordem) + 1 });
    } else {
      alert("Erro ao publicar aula: " + error.message);
    }
    setLoading(false);
  };

  const deletarCurso = async (id) => {
    if(window.confirm("Atenção: Excluir este curso removerá todas as aulas e matrículas vinculadas. Deseja continuar?")) {
      const { error } = await supabase.from('cursos').delete().eq('id', id);
      if(!error) {
        carregarCursos();
      } else {
        alert("Erro ao deletar: " + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Admin */}
      <div className="bg-white border-b p-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5B2DFF] text-white rounded-xl shadow-lg shadow-purple-100">
              <Database size={20} />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-800 uppercase italic leading-none">Gestão Verbo</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel do Administrador</span>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setAba('cursos')} 
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${aba === 'cursos' ? 'bg-white shadow-sm text-[#5B2DFF]' : 'text-gray-500'}`}
            >
              Cursos
            </button>
            <button 
              onClick={() => setAba('aulas')} 
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${aba === 'aulas' ? 'bg-white shadow-sm text-[#5B2DFF]' : 'text-gray-500'}`}
            >
              Aulas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUNA DE CADASTRO (FORMULÁRIO) */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24">
            <h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2">
              <Plus size={18} className="text-[#5B2DFF]" /> 
              {aba === 'cursos' ? 'Novo Curso' : 'Nova Aula'}
            </h2>

            {aba === 'cursos' ? (
              <form onSubmit={salvarCurso} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Título do Curso</label>
                  <input 
                    placeholder="Ex: Formação de Pregadores" 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 font-bold" 
                    value={novoCurso.titulo} 
                    onChange={e => setNovoCurso({...novoCurso, titulo: e.target.value})} 
                    required 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Descrição</label>
                  <textarea 
                    placeholder="O que os alunos aprenderão?" 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 min-h-[80px] font-medium" 
                    value={novoCurso.descricao} 
                    onChange={e => setNovoCurso({...novoCurso, descricao: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[#5B2DFF] uppercase ml-2 flex items-center gap-1">
                      <Tag size={10} /> ID Hotmart
                    </label>
                    <input 
                      placeholder="Ex: 12345" 
                      className="w-full mt-1 p-4 bg-purple-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 font-black text-[#5B2DFF]" 
                      value={novoCurso.hotmart_id} 
                      onChange={e => setNovoCurso({...novoCurso, hotmart_id: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-500 uppercase ml-2 flex items-center gap-1">
                      <ShoppingCart size={10} /> Checkout URL
                    </label>
                    <input 
                      placeholder="Link Hotmart" 
                      className="w-full mt-1 p-4 bg-orange-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-orange-200 font-bold text-orange-600" 
                      value={novoCurso.checkout_url} 
                      onChange={e => setNovoCurso({...novoCurso, checkout_url: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">URL da Capa</label>
                  <input 
                    placeholder="Link da imagem" 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200" 
                    value={novoCurso.capa_url} 
                    onChange={e => setNovoCurso({...novoCurso, capa_url: e.target.value})} 
                  />
                </div>
                
                <button disabled={loading} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-purple-100 flex items-center justify-center gap-2 transition-transform active:scale-95">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Cadastrar Curso'}
                </button>
              </form>
            ) : (
              <form onSubmit={salvarAula} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Selecionar Curso</label>
                  <select 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 font-bold" 
                    value={novaAula.curso_id} 
                    onChange={e => setNovaAula({...novaAula, curso_id: e.target.value})} 
                    required
                  >
                    <option value="">Selecione um curso...</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Título da Aula</label>
                  <input 
                    placeholder="Ex: Introdução" 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 font-bold" 
                    value={novaAula.titulo} 
                    onChange={e => setNovaAula({...novaAula, titulo: e.target.value})} 
                    required 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Link do Vídeo</label>
                  <input 
                    placeholder="URL do YouTube" 
                    className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200" 
                    value={novaAula.video_url} 
                    onChange={e => setNovaAula({...novaAula, video_url: e.target.value})} 
                    required 
                  />
                </div>

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Ordem</label>
                    <input 
                      type="number" 
                      className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-purple-200 text-center font-bold" 
                      value={novaAula.ordem} 
                      onChange={e => setNovaAula({...novaAula, ordem: e.target.value})} 
                    />
                  </div>
                  <div className="flex-1 pt-5">
                    <button disabled={loading} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-purple-100 flex items-center justify-center transition-transform active:scale-95">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : 'Publicar'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* COLUNA DE LISTAGEM */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">
              Cursos no Banco ({cursos.length})
            </h2>
            {fetching && <Loader2 className="animate-spin text-slate-300" size={16} />}
          </div>

          <div className="grid gap-4">
            {cursos.map(curso => (
              <div key={curso.id} className="bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-50 flex items-center justify-center">
                    {curso.capa_url ? (
                      <img src={curso.capa_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{curso.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[9px] bg-purple-50 text-[#5B2DFF] px-2 py-0.5 rounded-full font-black uppercase">
                        Hotmart: {curso.hotmart_id || '---'}
                      </span>
                      {curso.checkout_url && (
                        <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1">
                          <ShoppingCart size={8} /> Checkout OK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setAba('aulas'); setNovaAula({...novaAula, curso_id: curso.id}); }} 
                    className="p-3 bg-purple-50 text-[#5B2DFF] rounded-xl hover:bg-[#5B2DFF] hover:text-white transition-all shadow-sm" 
                  >
                    <Plus size={18} />
                  </button>
                  
                  <Link 
                    to={`/aulas/${curso.id}`} 
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                  >
                    <ExternalLink size={18} />
                  </Link>

                  <button 
                    onClick={() => deletarCurso(curso.id)} 
                    className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;