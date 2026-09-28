import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Edit3, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const vazioQuestao = { enunciado:'', alternativaA:'', alternativaB:'', alternativaC:'', alternativaD:'', resposta_correta:'A', explicacao:'' };

const AdminAvaliacoes = () => {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [cursoId, setCursoId] = useState('');
  const [materias, setMaterias] = useState([]);
  const [materiaId, setMateriaId] = useState('');
  const [avaliacao, setAvaliacao] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [dadosAvaliacao, setDadosAvaliacao] = useState({ titulo:'Avaliação Final', descricao:'', nota_minima:70, ativa:true });
  const [questao, setQuestao] = useState(vazioQuestao);
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputClass='w-full p-3.5 bg-slate-50 rounded-2xl text-sm border border-transparent font-semibold focus:ring-2 focus:ring-purple-200 outline-none';

  useEffect(() => { carregarCursos(); }, []);
  useEffect(() => { if (cursoId) carregarMaterias(); else { setMaterias([]); setMateriaId(''); } }, [cursoId]);
  useEffect(() => { if (materiaId) carregarAvaliacao(); else { setAvaliacao(null); setQuestoes([]); } }, [materiaId]);

  const carregarCursos = async () => {
    const { data } = await supabase.from('cursos').select('id,titulo').order('titulo');
    setCursos(data || []);
  };

  const carregarMaterias = async () => {
    const { data } = await supabase.from('materias').select('id,titulo,ordem').eq('curso_id',cursoId).order('ordem');
    setMaterias(data || []);
    setMateriaId(data?.[0]?.id || '');
  };

  const carregarAvaliacao = async () => {
    setLoading(true);
    const { data } = await supabase.from('avaliacoes').select('*').eq('materia_id',materiaId).maybeSingle();
    const aval = data || null;
    setAvaliacao(aval);
    if (aval) {
      setDadosAvaliacao({ titulo:aval.titulo, descricao:aval.descricao || '', nota_minima:aval.nota_minima, ativa:aval.ativa });
      const { data: qs } = await supabase.from('questoes_avaliacao').select('*').eq('avaliacao_id',aval.id).order('ordem');
      setQuestoes(qs || []);
    } else {
      setDadosAvaliacao({ titulo:'Avaliação Final', descricao:'', nota_minima:70, ativa:true });
      setQuestoes([]);
    }
    setQuestao(vazioQuestao);
    setEditandoId(null);
    setLoading(false);
  };

  const salvarAvaliacao = async () => {
    setLoading(true);
    const payload = { ...dadosAvaliacao, materia_id:materiaId, nota_minima:Number(dadosAvaliacao.nota_minima) };
    const result = avaliacao
      ? await supabase.from('avaliacoes').update(payload).eq('id',avaliacao.id).select().single()
      : await supabase.from('avaliacoes').insert(payload).select().single();
    if (result.error) alert(result.error.message);
    else { setAvaliacao(result.data); alert('Avaliação salva.'); }
    setLoading(false);
  };

  const salvarQuestao = async () => {
    if (!avaliacao) { alert('Salve a avaliação antes de adicionar questões.'); return; }
    if (!questao.enunciado.trim() || [questao.alternativaA,questao.alternativaB,questao.alternativaC,questao.alternativaD].some(v => !v.trim())) {
      alert('Preencha o enunciado e as quatro alternativas.');
      return;
    }
    setLoading(true);
    const payload = {
      avaliacao_id: avaliacao.id,
      enunciado: questao.enunciado.trim(),
      alternativas: [
        { valor:'A', texto:questao.alternativaA.trim() },
        { valor:'B', texto:questao.alternativaB.trim() },
        { valor:'C', texto:questao.alternativaC.trim() },
        { valor:'D', texto:questao.alternativaD.trim() }
      ],
      resposta_correta: questao.resposta_correta,
      explicacao: questao.explicacao.trim() || null,
      ordem: editandoId ? (questoes.find(q=>q.id===editandoId)?.ordem || 1) : questoes.length + 1
    };
    const result = editandoId
      ? await supabase.from('questoes_avaliacao').update(payload).eq('id',editandoId)
      : await supabase.from('questoes_avaliacao').insert(payload);
    if (result.error) alert(result.error.message);
    else { setQuestao(vazioQuestao); setEditandoId(null); await carregarAvaliacao(); }
    setLoading(false);
  };

  const editarQuestao = (q) => {
    const alternativas = q.alternativas || [];
    const get = v => alternativas.find(a=>a.valor===v)?.texto || '';
    setQuestao({ enunciado:q.enunciado, alternativaA:get('A'), alternativaB:get('B'), alternativaC:get('C'), alternativaD:get('D'), resposta_correta:q.resposta_correta, explicacao:q.explicacao || '' });
    setEditandoId(q.id);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const excluirQuestao = async (id) => {
    if (!window.confirm('Excluir esta questão?')) return;
    await supabase.from('questoes_avaliacao').delete().eq('id',id);
    carregarAvaliacao();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-slate-100"><ArrowLeft size={20}/></button>
          <div><p className="text-[9px] font-black uppercase tracking-widest text-[#4C1D95]">Gestão Verbo</p><h1 className="text-sm font-black">Avaliações</h1></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <select className={inputClass} value={cursoId} onChange={e=>setCursoId(e.target.value)}>
            <option value="">Selecione o curso...</option>
            {cursos.map(c=><option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
          <select className={inputClass} value={materiaId} onChange={e=>setMateriaId(e.target.value)} disabled={!cursoId}>
            <option value="">Selecione a matéria...</option>
            {materias.map(m=><option key={m.id} value={m.id}>{m.ordem}. {m.titulo}</option>)}
          </select>
        </div>

        {!materiaId ? (
          <div className="bg-white rounded-[28px] p-14 text-center border border-slate-100"><p className="text-slate-400 font-bold text-sm">Escolha uma matéria para criar ou editar sua avaliação.</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-[28px] border border-slate-100 p-6 space-y-4 lg:sticky lg:top-24">
                <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Configuração</p><h2 className="text-lg font-black text-slate-800 mt-1">Avaliação da matéria</h2></div>
                <input className={inputClass} value={dadosAvaliacao.titulo} onChange={e=>setDadosAvaliacao(v=>({...v,titulo:e.target.value}))} placeholder="Título"/>
                <textarea className={inputClass} rows={4} value={dadosAvaliacao.descricao} onChange={e=>setDadosAvaliacao(v=>({...v,descricao:e.target.value}))} placeholder="Descrição"/>
                <div><label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nota mínima (%)</label><input type="number" min="0" max="100" className={inputClass} value={dadosAvaliacao.nota_minima} onChange={e=>setDadosAvaliacao(v=>({...v,nota_minima:e.target.value}))}/></div>
                <label className="flex items-center gap-3 text-xs font-bold text-slate-600"><input type="checkbox" checked={dadosAvaliacao.ativa} onChange={e=>setDadosAvaliacao(v=>({...v,ativa:e.target.checked}))}/> Avaliação disponível para alunos</label>
                <button onClick={salvarAvaliacao} disabled={loading} className="w-full py-4 rounded-2xl bg-[#4C1D95] text-white text-xs font-black uppercase flex items-center justify-center gap-2">{loading?<Loader2 className="animate-spin" size={15}/>:<><Save size={15}/>Salvar avaliação</>}</button>
                {avaliacao && <div className="rounded-2xl bg-purple-50 p-4 text-xs text-purple-800 font-bold">{questoes.length} questão{questoes.length!==1?'ões':''} cadastrada{questoes.length!==1?'s':''}</div>}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-5">
              {avaliacao && (
                <div className="bg-white rounded-[28px] border border-slate-100 p-6">
                  <div className="flex items-center justify-between gap-3 mb-5"><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Banco de questões</p><h2 className="text-lg font-black text-slate-800">{editandoId?'Editar questão':'Nova questão'}</h2></div>{editandoId&&<button onClick={()=>{setQuestao(vazioQuestao);setEditandoId(null)}} className="text-[10px] font-black uppercase text-slate-400">Cancelar edição</button>}</div>
                  <textarea className={inputClass} rows={4} value={questao.enunciado} onChange={e=>setQuestao(q=>({...q,enunciado:e.target.value}))} placeholder="Enunciado da questão"/>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {['A','B','C','D'].map(letra=><input key={letra} className={inputClass} value={questao['alternativa'+letra]} onChange={e=>setQuestao(q=>({...q,['alternativa'+letra]:e.target.value}))} placeholder={`Alternativa ${letra}`}/>)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <select className={inputClass} value={questao.resposta_correta} onChange={e=>setQuestao(q=>({...q,resposta_correta:e.target.value}))}><option value="A">Resposta correta: A</option><option value="B">Resposta correta: B</option><option value="C">Resposta correta: C</option><option value="D">Resposta correta: D</option></select>
                    <input className={inputClass} value={questao.explicacao} onChange={e=>setQuestao(q=>({...q,explicacao:e.target.value}))} placeholder="Explicação da resposta (opcional)"/>
                  </div>
                  <button onClick={salvarQuestao} disabled={loading} className="mt-3 w-full py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase flex items-center justify-center gap-2">{loading?<Loader2 className="animate-spin" size={15}/>:<><Plus size={15}/>{editandoId?'Salvar questão':'Adicionar questão'}</>}</button>
                </div>
              )}

              <div className="space-y-3">
                {questoes.map((q,index)=>(
                  <div key={q.id} className="bg-white rounded-[24px] border border-slate-100 p-5">
                    <div className="flex items-start gap-3"><div className="w-8 h-8 rounded-xl bg-purple-50 text-[#4C1D95] flex items-center justify-center text-[10px] font-black shrink-0">{index+1}</div><div className="flex-1"><p className="text-sm font-bold text-slate-800">{q.enunciado}</p><div className="grid md:grid-cols-2 gap-2 mt-3">{(q.alternativas||[]).map(a=><div key={a.valor} className={`p-2.5 rounded-xl text-xs ${a.valor===q.resposta_correta?'bg-emerald-50 text-emerald-700 font-bold':'bg-slate-50 text-slate-500'}`}>{a.valor}. {a.texto}{a.valor===q.resposta_correta&&' ✓'}</div>)}</div></div><div className="flex gap-1"><button onClick={()=>editarQuestao(q)} className="p-2 rounded-xl bg-purple-50 text-[#4C1D95]"><Edit3 size={14}/></button><button onClick={()=>excluirQuestao(q.id)} className="p-2 rounded-xl bg-red-50 text-red-400"><Trash2 size={14}/></button></div></div>
                  </div>
                ))}
                {avaliacao && questoes.length===0 && <div className="bg-white rounded-[24px] border border-dashed border-purple-200 p-10 text-center text-slate-400 text-sm font-bold">Cadastre a primeira questão.</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAvaliacoes;
