import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Database, Loader2, Image as ImageIcon, ShoppingCart, 
  Users, PenTool, BarChart3, Trash2, TrendingUp, Target, Award, ArrowLeft,
  FileText, UploadCloud, X, Megaphone, Send, Bell, Sparkles
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate(); 
  const [aba, setAba] = useState('analytics'); 
  const [cursos, setCursos] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]); // Novo
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalSermoes: 0,
    totalMatriculas: 0,
    totalProgresso: 0,
    loadingStats: true
  });

  const [dadosGrafico, setDadosGrafico] = useState([]); 

  const metas = { usuarios: 50, sermoes: 100, alunos: 50, sermoesDiarios: 14 };

  const [novoCurso, setNovoCurso] = useState({ 
    titulo: '', 
    descricao: '', 
    capa_url: '', 
    hotmart_id: '',
    checkout_url: '' 
  });
  
  const [novaAula, setNovaAula] = useState({ 
    titulo: '', 
    video_url: '', 
    material_url: '', 
    curso_id: '', 
    ordem: 1 
  });

  // ESTADO PARA COMUNICADOS
  const [novaNotificacao, setNovaNotificacao] = useState({ 
    titulo: '', 
    mensagem: '', 
    tipo: 'sistema', 
    link: '' 
  });

  useEffect(() => {
    carregarCursos();
    carregarAnalytics();
    carregarNotificacoes();
  }, []);

  const carregarNotificacoes = async () => {
    const { data } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(5);
    if (data) setNotificacoes(data);
  };

  const carregarAnalytics = async () => {
    try {
      const { count: usuarios } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: sermoes } = await supabase.from('sermoes').select('*', { count: 'exact', head: true });
      const { count: matriculas } = await supabase.from('matriculas').select('*', { count: 'exact', head: true });
      const { count: progresso } = await supabase.from('progresso_aulas').select('*', { count: 'exact', head: true });

      setStats({
        totalUsuarios: usuarios || 0,
        totalSermoes: sermoes || 0,
        totalMatriculas: matriculas || 0,
        totalProgresso: progresso || 0,
        loadingStats: false
      });

      const hoje = new Date();
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      let ultimos7Dias = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(hoje.getDate() - i);
        const dataFormatada = d.toISOString().split('T')[0];
        
        const { count } = await supabase
          .from('sermoes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${dataFormatada}T00:00:00`)
          .lte('created_at', `${dataFormatada}T23:59:59`);

        ultimos7Dias.push({
          label: diasSemana[d.getDay()],
          valor: count || 0
        });
      }
      setDadosGrafico(ultimos7Dias);
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
    }
  };

  const carregarCursos = async () => {
    setFetching(true);
    const { data } = await supabase.from('cursos').select('*').order('created_at', { ascending: false });
    if (data) setCursos(data);
    setFetching(false);
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Por favor, envie apenas arquivos PDF.");
      return;
    }
    setUploadingPDF(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('materiais').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('materiais').getPublicUrl(filePath);
      setNovaAula({ ...novaAula, material_url: data.publicUrl });
      alert("✅ Apostila carregada com sucesso!");
    } catch (error) {
      alert("Erro ao subir arquivo.");
    } finally {
      setUploadingPDF(false);
    }
  };

  const salvarCurso = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('cursos').insert([novoCurso]);
    if (!error) {
      alert("Curso criado com sucesso!");
      setNovoCurso({ titulo: '', descricao: '', capa_url: '', hotmart_id: '', checkout_url: '' });
      await carregarCursos();
      carregarAnalytics();
    }
    setLoading(false);
  };

  const salvarAula = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aulas').insert([novaAula]);
    if (!error) {
      alert("Aula publicada!");
      setNovaAula({ ...novaAula, titulo: '', video_url: '', material_url: '', ordem: Number(novaAula.ordem) + 1 });
      carregarAnalytics();
    }
    setLoading(false);
  };

  const salvarNotificacao = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('notificacoes').insert([novaNotificacao]);
    if (!error) {
      alert("📢 Comunicado enviado com sucesso!");
      setNovaNotificacao({ titulo: '', mensagem: '', tipo: 'sistema', link: '' });
      carregarNotificacoes();
    }
    setLoading(false);
  };

  const deletarCurso = async (id) => {
    if(window.confirm("Atenção: Excluir este curso removerá tudo. Continuar?")) {
      const { error } = await supabase.from('cursos').delete().eq('id', id);
      if(!error) carregarCursos();
    }
  };

  const deletarNotificacao = async (id) => {
    if(window.confirm("Remover este comunicado?")) {
      await supabase.from('notificacoes').delete().eq('id', id);
      carregarNotificacoes();
    }
  };

  const MetaBar = ({ atual, alvo, label, icon: Icon, color }) => {
    const porcentagem = Math.min((atual / alvo) * 100, 100);
    return (
      <div className="space-y-2 mt-4">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2 text-slate-400">
            <Icon size={12} className={color} />
            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
          </div>
          <span className="text-[10px] font-bold text-white">{atual}/{alvo}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div 
            className={`h-full transition-all duration-1000 ${color.replace('text-', 'bg-')}`} 
            style={{ width: `${porcentagem}%`, boxShadow: `0 0 8px ${color === 'text-purple-400' ? '#a78bfa' : '#4ade80'}` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${aba === 'analytics' ? 'bg-[#0f0b1e]' : 'bg-slate-50'} pb-20`}>
      
      <div className={`${aba === 'analytics' ? 'bg-[#16112c]/80 border-white/5 backdrop-blur-xl' : 'bg-white border-b'} p-6 shadow-sm sticky top-0 z-50`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/perfil')} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border ${aba === 'analytics' ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><ArrowLeft size={14} /> Voltar</button>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shadow-lg ${aba === 'analytics' ? 'bg-purple-500 text-white' : 'bg-[#5B2DFF] text-white'}`}><Database size={20} /></div>
              <h1 className={`font-black text-xl uppercase italic leading-none hidden sm:block ${aba === 'analytics' ? 'text-white' : 'text-slate-800'}`}>Gestão Verbo</h1>
            </div>
          </div>
          
          <div className={`flex p-1 rounded-2xl ${aba === 'analytics' ? 'bg-white/5 border border-white/10' : 'bg-slate-100'}`}>
            <button onClick={() => setAba('analytics')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aba === 'analytics' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Analytics</button>
            <button onClick={() => setAba('cursos')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aba === 'cursos' ? 'bg-white text-[#5B2DFF] shadow-sm' : 'text-gray-500'}`}>Cursos</button>
            <button onClick={() => setAba('aulas')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aba === 'aulas' ? 'bg-white text-[#5B2DFF] shadow-sm' : 'text-gray-500'}`}>Aulas</button>
            <button onClick={() => setAba('comunicados')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${aba === 'comunicados' ? 'bg-white text-[#5B2DFF] shadow-sm' : 'text-gray-500'}`}>Comunicados</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {aba === 'analytics' ? (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-3"><TrendingUp className="text-purple-400" size={20} /><h2 className="text-white font-black uppercase tracking-tighter text-lg italic">Visão Estratégica</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl w-fit mb-4"><Users size={24} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Usuários</p>
                <h3 className="text-4xl font-black text-white mt-1 italic">{stats.totalUsuarios}</h3>
                <MetaBar atual={stats.totalUsuarios} alvo={metas.usuarios} label="Meta Usuários" icon={Target} color="text-purple-400" />
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl w-fit mb-4"><PenTool size={24} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sermões Gerados</p>
                <h3 className="text-4xl font-black text-white mt-1 italic">{stats.totalSermoes}</h3>
                <MetaBar atual={stats.totalSermoes} alvo={metas.sermoes} label="Meta Sermões" icon={BarChart3} color="text-blue-400" />
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-md">
                <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl w-fit mb-4"><Award size={24} /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Alunos Ativos</p>
                <h3 className="text-4xl font-black text-white mt-1 italic">{stats.totalMatriculas}</h3>
                <MetaBar atual={stats.totalMatriculas} alvo={metas.alunos} label="Meta Alunos" icon={ShoppingCart} color="text-green-400" />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-xl">
              <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2"><PenTool size={18} className="text-purple-400" /> ATIVIDADE RECENTE</h4>
              <div className="h-40 flex items-end gap-3 px-2">
                {dadosGrafico.map((dia, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-purple-500/40 rounded-t-xl transition-all duration-700 border-t border-purple-400" style={{ height: `${(dia.valor/metas.sermoesDiarios)*100}%` }} />
                    <span className="text-[9px] font-black text-slate-500 uppercase">{dia.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : aba === 'comunicados' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24">
                <h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2"><Megaphone size={18} className="text-orange-500" /> Novo Aviso</h2>
                <form onSubmit={salvarNotificacao} className="space-y-4">
                  <select className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novaNotificacao.tipo} onChange={e => setNovaNotificacao({...novaNotificacao, tipo: e.target.value})}>
                    <option value="sistema">⚙️ Atualização do App</option>
                    <option value="aula">📚 Nova Aula/Curso</option>
                    <option value="promocao">🔥 Promoção</option>
                  </select>
                  <input placeholder="Título" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novaNotificacao.titulo} onChange={e => setNovaNotificacao({...novaNotificacao, titulo: e.target.value})} required />
                  <textarea placeholder="Mensagem..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none min-h-[120px]" value={novaNotificacao.mensagem} onChange={e => setNovaNotificacao({...novaNotificacao, mensagem: e.target.value})} required />
                  <input placeholder="Link (opcional)" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-medium text-blue-500" value={novaNotificacao.link} onChange={e => setNovaNotificacao({...novaNotificacao, link: e.target.value})} />
                  <button disabled={loading} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16}/> Enviar Agora</>}
                  </button>
                </form>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest px-2">Histórico de Avisos</h2>
              {notificacoes.map(n => (
                <div key={n.id} className="bg-white p-6 rounded-[28px] border border-slate-100 flex items-start justify-between group">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 ${n.tipo === 'promocao' ? 'bg-orange-50 text-orange-500' : n.tipo === 'aula' ? 'bg-purple-50 text-[#5B2DFF]' : 'bg-blue-50 text-blue-500'}`}>
                      {n.tipo === 'promocao' ? <Sparkles size={20}/> : n.tipo === 'aula' ? <Bell size={20}/> : <Megaphone size={20}/>}
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-slate-800 text-sm uppercase italic tracking-tighter">{n.titulo}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{n.mensagem}</p>
                      <span className="text-[9px] font-bold text-slate-300 mt-2 block uppercase">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => deletarNotificacao(n.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-24">
                <h2 className="font-black text-slate-800 uppercase text-sm mb-6 flex items-center gap-2"><Plus size={18} className="text-[#5B2DFF]" /> {aba === 'cursos' ? 'Novo Curso' : 'Nova Aula'}</h2>
                {aba === 'cursos' ? (
                  <form onSubmit={salvarCurso} className="space-y-4">
                    <input placeholder="Título" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novoCurso.titulo} onChange={e => setNovoCurso({...novoCurso, titulo: e.target.value})} required />
                    <textarea placeholder="Descrição" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none min-h-[80px]" value={novoCurso.descricao} onChange={e => setNovoCurso({...novoCurso, descricao: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="ID Hotmart" className="w-full p-4 bg-purple-50 rounded-2xl text-sm border-none font-black text-[#5B2DFF]" value={novoCurso.hotmart_id} onChange={e => setNovoCurso({...novoCurso, hotmart_id: e.target.value})} required />
                      <input placeholder="Checkout URL" className="w-full p-4 bg-orange-50 rounded-2xl text-sm border-none font-bold text-orange-600" value={novoCurso.checkout_url} onChange={e => setNovoCurso({...novoCurso, checkout_url: e.target.value})} required />
                    </div>
                    <input placeholder="URL da Capa" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novoCurso.capa_url} onChange={e => setNovoCurso({...novoCurso, capa_url: e.target.value})} />
                    <button disabled={loading} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg">{loading ? <Loader2 className="animate-spin" size={16} /> : 'Cadastrar Curso'}</button>
                  </form>
                ) : (
                  <form onSubmit={salvarAula} className="space-y-4">
                    <select className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novaAula.curso_id} onChange={e => setNovaAula({...novaAula, curso_id: e.target.value})} required>
                      <option value="">Selecione um curso...</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                    </select>
                    <input placeholder="Título da Aula" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none font-bold" value={novaAula.titulo} onChange={e => setNovaAula({...novaAula, titulo: e.target.value})} required />
                    <input placeholder="Link do Vídeo" className="w-full p-4 bg-slate-50 rounded-2xl text-sm border-none" value={novaAula.video_url} onChange={e => setNovaAula({...novaAula, video_url: e.target.value})} required />
                    <div className="space-y-2">
                      {!novaAula.material_url ? (
                        <div className="relative group">
                          <input type="file" accept=".pdf" onChange={handleUploadPDF} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploadingPDF} />
                          <div className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${uploadingPDF ? 'bg-slate-50 border-slate-200' : 'bg-orange-50/30 border-orange-200 group-hover:bg-orange-50'}`}>
                            {uploadingPDF ? <><Loader2 className="animate-spin text-orange-500 mb-2" size={20} /><span className="text-[10px] font-black text-orange-500 uppercase">Subindo...</span></> : <><UploadCloud className="text-orange-400 mb-1" size={24} /><span className="text-[10px] font-black text-orange-600 uppercase">Anexar Apostila</span></>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100"><div className="flex items-center gap-3 overflow-hidden"><FileText className="text-green-500 shrink-0" size={18} /><span className="text-[10px] font-bold text-green-700 truncate text-left">PDF OK</span></div><button onClick={() => setNovaAula({...novaAula, material_url: ''})} className="p-1 text-green-600"><X size={14} /></button></div>
                      )}
                    </div>
                    <button disabled={loading || uploadingPDF} className="w-full py-4 bg-[#5B2DFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg">{loading ? <Loader2 className="animate-spin" size={16} /> : 'Publicar Aula'}</button>
                  </form>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-4 px-2"><h2 className="font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">Cursos no Banco ({cursos.length})</h2>{fetching && <Loader2 className="animate-spin text-slate-300" size={16} />}</div>
              <div className="grid gap-4">
                {cursos.map(curso => (
                  <div key={curso.id} className="bg-white p-5 rounded-[28px] border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-50">{curso.capa_url ? <img src={curso.capa_url} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300" size={24} />}</div>
                      <div className="min-w-0 text-left"><h3 className="font-bold text-slate-800 text-sm truncate">{curso.titulo}</h3><span className="text-[9px] bg-purple-50 text-[#5B2DFF] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">ID: {curso.hotmart_id}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setAba('aulas'); setNovaAula({...novaAula, curso_id: curso.id}); }} className="p-3 bg-purple-50 text-[#5B2DFF] rounded-xl hover:bg-[#5B2DFF] hover:text-white transition-all"><Plus size={18} /></button>
                      <button onClick={() => deletarCurso(curso.id)} className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;