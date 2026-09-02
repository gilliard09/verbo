import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { track } from '../lib/analytics';
import { supabase } from '../supabaseClient';
import {
  Save, ArrowLeft, Book, Loader2,
  Bold, Italic, Quote, Highlighter, CheckCircle2,
  Clock, AlignLeft, RotateCcw, Maximize2, Minimize2,
  AlertTriangle, X, Lock, WifiOff, Sparkles, ArrowRight,
} from 'lucide-react';

// ── Offline layer ──────────────────────────────────────────────────────────────
import { getSermaoLocal, upsertSermaoLocal, enqueueOp } from '../lib/db';
import { gerarIdLocal } from '../lib/sync';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { usePlano } from '../hooks/usePlano';

const PALAVRAS_POR_MINUTO = 120;
const AUTO_SAVE_DELAY     = 30000;
const RASCUNHO_KEY  = (id) => `verbo_rascunho_${id  || 'novo'}`;
const HISTORICO_KEY = (id) => `verbo_historico_${id || 'novo'}`;

// ── Conteúdo dos modais de upgrade por degrau (usuários gratuitos) ────────────
// A mensagem escala em intensidade conforme o número de sermões criados:
// 1º sermão é só um "oi, existe um plano melhor" sem pressão; 2º já reforça
// o hábito formado e mostra o benefício concreto (ilimitado + Academia);
// 3º é a oferta mais direta, porque nesse ponto o usuário já provou que usa
// o produto de verdade — dado mostra que quem vê o modal aqui converte
// ~23,5% vs ~4% de quem nunca vê.
const CONTEUDO_DEGRAU = {
  1: {
    emoji: '🎉',
    titulo: 'Seu primeiro sermão está pronto!',
    corpo: 'Continue preparando suas mensagens gratuitamente ou conheça os recursos do Verbo. Sem pressão.',
  },
  2: {
    emoji: '📚',
    titulo: 'Você já está construindo sua biblioteca de mensagens.',
    corpo: 'No Plus, seus sermões são ilimitados e você ainda tem acesso a toda a Academia Verbo.',
  },
  3: {
    emoji: '✨',
    titulo: 'Você já utilizou seus 3 sermões gratuitos.',
    corpo: 'Continue preparando suas mensagens com o Verbo. Conheça o Plus e tenha sermões ilimitados + todos os cursos da Academia Verbo.',
  },
};

// Recursos da Academia Verbo mostrados no convite de upgrade do Fundador —
// Fundador não é o destino, é o primeiro degrau. Esse modal é independente
// do fluxo de degraus acima: dispara pra quem já é assinante Fundador,
// focado em cursos (o que o Fundador não tem acesso), não em "sermões
// ilimitados" (que ele já tem).
const RECURSOS_ACADEMIA = [
  'Teologia Fundamental',
  'Método Pregação Impactante',
  'Novo Testamento Explicado',
  'Discipulado Cristão',
  'Sermões ilimitados',
];

// ─── Hook: altura + offset real da viewport visível (contorna o bug do teclado no iOS) ──
// No iOS Safari, elementos `fixed` não recalculam quando o teclado abre — a
// viewport "visual" encolhe mas o layout `fixed inset-0` continua medindo a
// altura antiga, empurrando header/rodapé para trás do teclado.
//
// CORRIGIDO: só ajustar a altura não bastava. Quando o teclado abre, o Safari
// pode deslocar o viewport visual para cima dentro do viewport de layout
// (`visualViewport.offsetTop` deixa de ser 0). Elementos `position: fixed`
// ficam ancorados ao viewport de LAYOUT, não ao visual — então mesmo com a
// altura certa, o container ficava desalinhado verticalmente, sobrando um
// espaço em branco entre o conteúdo e o teclado. Agora rastreamos também o
// `offsetTop` e compensamos com `translateY` no container.
const useAlturaVisivel = () => {
  const [viewport, setViewport] = useState({
    altura: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
  });

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;

    const atualizar = () => {
      if (vv) setViewport({ altura: vv.height, offsetTop: vv.offsetTop });
      else setViewport({ altura: window.innerHeight, offsetTop: 0 });
    };

    atualizar();

    if (vv) {
      vv.addEventListener('resize', atualizar);
      vv.addEventListener('scroll', atualizar);
      return () => {
        vv.removeEventListener('resize', atualizar);
        vv.removeEventListener('scroll', atualizar);
      };
    }
    window.addEventListener('resize', atualizar);
    return () => window.removeEventListener('resize', atualizar);
  }, []);

  return viewport;
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ visivel, tipo, mensagem, onFechar }) => (
  <div className={`fixed top-6 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm px-0 transition-all duration-400 ${visivel ? '-translate-x-1/2 translate-y-0 opacity-100 scale-100' : '-translate-x-1/2 -translate-y-4 opacity-0 scale-95 pointer-events-none'}`}
    style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
  >
    <div className={`flex items-start gap-3 px-5 py-3.5 rounded-[20px] shadow-2xl border ${tipo === 'sucesso' ? 'bg-green-500 border-green-400 text-white' : tipo === 'erro' ? 'bg-red-500 border-red-400 text-white' : 'bg-slate-900 border-white/10 text-white'}`}>
      {tipo === 'sucesso' && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
      {tipo === 'erro'    && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
      {tipo === 'offline' && <WifiOff size={16} className="shrink-0 mt-0.5" />}
      <span className="text-xs font-bold uppercase tracking-wide leading-snug break-words">{mensagem}</span>
      <button onClick={onFechar} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  </div>
);

// ─── Modal de upgrade — cobre dois públicos com o mesmo componente ────────────
// Não bloqueia nada (o plano gratuito continua permitindo criar sermões);
// é só uma oferta no momento em que a pessoa demonstrou algum nível de uso.
//
// `estado.tipo === 'degrau'` → usuário gratuito, mensagem escala com
// `estado.degrau` (1, 2 ou 3).
// `estado.tipo === 'fundador'` → usuário já assinante Fundador, convite
// pra migrar pro Plus com foco na Academia (cursos), não em sermões
// ilimitados (que ele já tem).
const ModalUpgrade = ({ estado, onFechar, onVerPlanos }) => {
  if (!estado?.aberto) return null;

  if (estado.tipo === 'fundador') {
    return (
      <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
        <div className="relative bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-br from-[#4C1D95] to-[#7C3AED] p-7 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <button
              onClick={onFechar}
              aria-label="Fechar"
              className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={26} className="text-white" />
            </div>
            <p className="text-white font-black text-lg leading-tight">
              Quer continuar sua formação?
            </p>
          </div>
          <div className="p-6">
            <p className="text-slate-400 text-[10px] font-black text-center uppercase tracking-widest mb-4">
              No Verbo Plus você encontra
            </p>
            <ul className="space-y-2.5 mb-6">
              {RECURSOS_ACADEMIA.map((recurso) => (
                <li key={recurso} className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                  <CheckCircle2 size={17} className="text-[#4C1D95] shrink-0" />
                  {recurso}
                </li>
              ))}
            </ul>
            <button
              onClick={onVerPlanos}
              className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#5B21B6] active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
            >
              Fazer upgrade para o Plus <ArrowRight size={16} />
            </button>
            <button
              onClick={onFechar}
              className="w-full text-slate-400 text-xs font-bold py-2"
            >
              Continuar como Fundador
            </button>
          </div>
        </div>
      </div>
    );
  }

  const conteudo = CONTEUDO_DEGRAU[estado.degrau] || CONTEUDO_DEGRAU[3];

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-br from-[#4C1D95] to-[#7C3AED] p-7 text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={26} className="text-white" />
          </div>
          <p className="text-white font-black text-lg leading-tight">
            {conteudo.titulo} {conteudo.emoji}
          </p>
        </div>
        <div className="p-6">
          <p className="text-slate-500 text-sm text-center leading-relaxed mb-6">
            {conteudo.corpo}
          </p>
          <button
            onClick={onVerPlanos}
            className="w-full bg-[#4C1D95] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#5B21B6] active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
          >
            Conhecer o Plus <ArrowRight size={16} />
          </button>
          <button
            onClick={onFechar}
            className="w-full text-slate-400 text-xs font-bold py-2"
          >
            Continuar no plano gratuito
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Botão de toolbar com alvo de toque de 44px ────────────────────────────────
const BotaoToolbar = ({ onClick, title, active, children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all active:scale-90 ${
      active ? 'bg-purple-100 text-purple-500' : 'hover:bg-white text-slate-500'
    }`}
  >
    {children}
  </button>
);

// ─── Editor ───────────────────────────────────────────────────────────────────
const Editor = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const textAreaRef = useRef(null);
  // CORRIGIDO: agora também extraímos offsetTop, usado no translateY do container
  const { altura: alturaVisivel, offsetTop } = useAlturaVisivel();

  // ── Tipo via URL ─────────────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const tipo   = params.get('tipo');

  // ── CORREÇÃO (Fundador vs Plus) ─────────────────────────────────────────
  // Antes usávamos só `isPlus` para decidir se mostra o modal/indicador de
  // upgrade. Isso é um bug: Fundador é plano PAGO (entrada, R$9,90) mas
  // isPlus = false para ele — então o modal de "vire assinante" continuava
  // aparecendo pra quem já é assinante Fundador. `isAssinante` (Fundador OU
  // Plus) é o conceito certo pro fluxo de degraus (gratuito → pagante).
  // `isFundador` especificamente é usado agora pro convite Fundador → Plus.
  const { isPlus, isFundador, isAssinante } = usePlano();
  const podeCreiarSermao = true;
  const sermoesRestantes = null;
  const percentualUso    = 0;

  // NOVO: um único estado cobre as duas famílias de modal (degrau do
  // usuário gratuito e convite Fundador→Plus) — { aberto, tipo, degrau }
  const [modalUpgrade, setModalUpgrade] = useState({ aberto: false, tipo: null, degrau: null });

  const [titulo,     setTitulo]     = useState('');
  const [conteudo,   setConteudo]   = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [telaCheia,  setTelaCheia]  = useState(true);
  const [autoSaveAtivo, setAutoSaveAtivo] = useState(false);
  const autoSaveRef = useRef(null);
  const [historico,       setHistorico]       = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [toast, setToast] = useState({ visivel: false, tipo: 'info', mensagem: '' });

  // Id local para sermões criados offline
  const localIdRef = useRef(id || null);

  const { isOnline, atualizarPendentes } = useOfflineSync();

  const metricas = useMemo(() => {
    const palavras = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;
    return { palavras, minutos: Math.ceil(palavras / PALAVRAS_POR_MINUTO) };
  }, [conteudo]);

  const mostrarToast = useCallback((mensagem, tipo = 'info', duracao = 3500) => {
    setToast({ visivel: true, tipo, mensagem });
    setTimeout(() => setToast(t => ({ ...t, visivel: false })), duracao);
  }, []);

  // Loga exibição/clique/dispensa do modal de upgrade — sem isso, não dá
  // pra saber se a queda de conversão acontece na decisão (ninguém clica)
  // ou depois, no checkout (clica mas não completa a compra).
  // NOVO: `variante` identifica qual modal gerou o evento (degrau_1,
  // degrau_2, degrau_3 ou fundador) — sem isso as quatro variantes ficam
  // misturadas numa única conta no funil do AdminDashboard.
  const logEventoModal = useCallback(async (acao, variante = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      await supabase.from('eventos_modal_upgrade').insert({ user_id: user.id, acao, variante });
    } catch {
      // Instrumentação não deve travar o fluxo do usuário se falhar
    }
  }, []);

  // ── Decide e exibe o modal de upgrade mais relevante para este momento ──
  // Cobre dois públicos diferentes, checados em sequência:
  //  1) Usuários gratuitos: escala conforme o Nº de sermões (1º/2º/3º),
  //     usando o degrau mais alto ainda não visto — cobre tanto o caminho
  //     normal (cria 1, depois 2, depois 3) quanto saltos (ex.: sync
  //     offline que grava vários de uma vez).
  //  2) Usuários Fundador: convite pontual pra migrar pro Plus, focado na
  //     Academia Verbo. Independente do fluxo de degraus — dispara mesmo
  //     em edição de sermão existente, não só em criação, porque um
  //     Fundador já ativo pode não criar sermões novos com frequência.
  // Retorna true se algum modal foi exibido, pra decidir se segura a
  // navegação de volta ao Dashboard.
  const verificarModalUpgrade = useCallback(async (user, eraSermaoNovo, totalSermoesUsuarioParam) => {
    try {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('viu_upgrade_sermao_1, viu_upgrade_sermao_2, viu_upgrade_sermoes, viu_upgrade_fundador')
        .eq('id', user.id)
        .maybeSingle();

      // ── Público 1: usuários gratuitos, gatilho por Nº de sermões ──
      if (eraSermaoNovo && !isAssinante) {
        const count = totalSermoesUsuarioParam ?? (
          await supabase
            .from('sermoes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ).count;

        let degrau = null;
        if (count >= 3 && !perfil?.viu_upgrade_sermoes) degrau = 3;
        else if (count >= 2 && !perfil?.viu_upgrade_sermao_2) degrau = 2;
        else if (count >= 1 && !perfil?.viu_upgrade_sermao_1) degrau = 1;

        if (degrau) {
          // Coluna do 3º degrau reaproveita o nome já existente
          // (viu_upgrade_sermoes) pra não quebrar histórico de usuários
          // que já tinham essa flag marcada antes desta mudança.
          const coluna = degrau === 3 ? 'viu_upgrade_sermoes' : `viu_upgrade_sermao_${degrau}`;
          await supabase
            .from('profiles')
            .update({ [coluna]: true, [`${coluna}_em`]: new Date().toISOString() })
            .eq('id', user.id);

          setModalUpgrade({ aberto: true, tipo: 'degrau', degrau });
          logEventoModal('exibido', `degrau_${degrau}`);
          return true;
        }
      }

      // ── Público 2: Fundador — convite pra virar Plus. Fundador não é
      // o destino, é o primeiro degrau. ──
      if (isFundador && !perfil?.viu_upgrade_fundador) {
        await supabase
          .from('profiles')
          .update({ viu_upgrade_fundador: true, viu_upgrade_fundador_em: new Date().toISOString() })
          .eq('id', user.id);

        setModalUpgrade({ aberto: true, tipo: 'fundador' });
        logEventoModal('exibido', 'fundador');
        return true;
      }
    } catch {
      // Se a checagem falhar, segue o fluxo normal sem modal
    }
    return false;
  }, [isAssinante, isFundador, logEventoModal]);

  // ── Estrutura guiada pelo tipo ────────────────────────────────────────────
  useEffect(() => {
    if (!id && !conteudo && tipo) {
      if (tipo === 'expositivo') {
        setConteudo(
`Texto base:

Introdução:

Contexto:

Ponto 1:

Ponto 2:

Ponto 3:

Conclusão:

Aplicação:`
        );
      }
      if (tipo === 'tematico') {
        setConteudo(
`Tema:

Texto base:

Introdução:

Ponto 1:

Ponto 2:

Ponto 3:

Conclusão:

Aplicação:`
        );
      }
      if (tipo === 'devocional') {
        setConteudo(
`Versículo:

Reflexão:

Aplicação prática:

Oração:`
        );
      }
    }
  }, [tipo, id]);

  // ── Foco automático no mobile ────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 300);
  }, []);

  // ── Analytics: registro de abertura do editor ─────────────────────────────
  useEffect(() => {
    track('editor_opened', { sermon_id: id || null, tipo: tipo || null });
  }, [id, tipo]);

  // ── Carregamento inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      carregarSermao(id);
    } else {
      // Sermão novo: tenta rascunho do localStorage (só se não veio com tipo guiado)
      if (!tipo) {
        const rascunho = localStorage.getItem(RASCUNHO_KEY(null));
        if (rascunho) {
          try {
            const { titulo: t, conteudo: c, referencia: r, savedAt } = JSON.parse(rascunho);
            setTitulo(t || ''); setConteudo(c || ''); setReferencia(r || '');
            const tempo = new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            mostrarToast(`Rascunho recuperado das ${tempo}`, 'info');
          } catch { /* silencioso */ }
        }
      }
    }
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY(id)) || '[]');
      setHistorico(hist);
    } catch { /* silencioso */ }
  }, [id, tipo]);

  async function carregarSermao(sermoId) {
    // 1. Carrega do IndexedDB imediatamente (sem esperar rede)
    const local = await getSermaoLocal(sermoId);
    if (local) {
      setTitulo(local.titulo || '');
      setConteudo(local.conteudo || '');
      setReferencia(local.referencia_biblica || '');
    }

    // 2. Tenta buscar versão mais recente do Supabase
    try {
      const { data, error } = await supabase
        .from('sermoes').select('*').eq('id', sermoId).single();
      if (error) throw error;
      if (data) {
        const localAt  = local ? new Date(local.updated_at || local.created_at || 0) : new Date(0);
        const remotoAt = new Date(data.updated_at || data.created_at || 0);
        if (remotoAt >= localAt) {
          setTitulo(data.titulo || '');
          setConteudo(data.conteudo || '');
          setReferencia(data.referencia_biblica || '');
          await upsertSermaoLocal({ ...data, _synced: true });
        }
      }
    } catch {
      if (!local) {
        mostrarToast('Offline e sem cache local para este sermão', 'erro');
      }
    }
  }

  // ── Auto-save no localStorage (rascunho) ───────────────────────────────────
  useEffect(() => {
    if (!conteudo && !titulo) return;
    clearTimeout(autoSaveRef.current);
    setAutoSaveAtivo(false);
    autoSaveRef.current = setTimeout(() => {
      setAutoSaveAtivo(true);
      const dados = { titulo, conteudo, referencia, savedAt: new Date().toISOString() };
      localStorage.setItem(RASCUNHO_KEY(id), JSON.stringify(dados));
      setTimeout(() => setAutoSaveAtivo(false), 2000);
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(autoSaveRef.current);
  }, [titulo, conteudo, referencia, id]);

  // ── Formatação de texto ────────────────────────────────────────────────────
  const aplicarFormatacao = useCallback((prefixo, sufixo) => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const novo  = conteudo.substring(0, start) + prefixo + conteudo.substring(start, end) + sufixo + conteudo.substring(end);
    setConteudo(novo);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefixo.length, end + prefixo.length);
    }, 10);
  }, [conteudo]);

  // ── Salvar ─────────────────────────────────────────────────────────────────
  async function salvar() {
    if (!titulo.trim()) { mostrarToast('Insira um título para salvar.', 'erro'); return; }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Sessão não encontrada');
      const agora = new Date().toISOString();

      if (id && conteudo.trim()) {
        const novoHistorico = [
          { conteudo, titulo, referencia, savedAt: agora },
          ...historico.slice(0, 4),
        ];
        localStorage.setItem(HISTORICO_KEY(id), JSON.stringify(novoHistorico));
        setHistorico(novoHistorico);
      }

      const dadosSermao = {
        titulo,
        conteudo,
        referencia_biblica: referencia,
        user_id: user.id,
      };

      let salvouOnline = false;
      const eraSermaoNovo = !id; // só sermões recém-criados contam pro gatilho de upgrade por degrau
      try {
        const res = id
          ? await supabase.from('sermoes').update(dadosSermao).eq('id', id)
          : await supabase.from('sermoes').insert([dadosSermao]).select().single();

        if (!res.error) {
          const idFinal = id || res.data?.id;
          if (idFinal) {
            await upsertSermaoLocal({
              ...dadosSermao,
              id: idFinal,
              created_at: res.data?.created_at || agora,
              _synced: true,
            });
          }
          salvouOnline = true;
          localStorage.removeItem(RASCUNHO_KEY(id));
          mostrarToast('Sermão salvo com sucesso!', 'sucesso');

          // ── Analytics: sermon_created / sermon_edited / first_sermon_created ──
          // Reaproveitamos a contagem de sermões do usuário tanto pra saber se é
          // o primeiro sermão (analytics) quanto pro gatilho de degrau do modal
          // de upgrade logo abaixo — evita rodar a mesma query duas vezes.
          let totalSermoesUsuario = null;
          if (eraSermaoNovo) {
            try {
              const { count } = await supabase
                .from('sermoes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);
              totalSermoesUsuario = count;
            } catch {
              // Se a contagem falhar, seguimos sem travar o save
            }
            track('sermon_created', { sermon_id: idFinal });
            if (totalSermoesUsuario === 1) {
              track('first_sermon_created', { sermon_id: idFinal });
            }
          } else {
            track('sermon_edited', { sermon_id: id });
          }

          // ── Gatilho de upgrade contextual ──────────────────────────────
          // Verifica os dois públicos (degraus do gratuito + convite
          // Fundador→Plus) numa única checagem. Se algum modal for
          // exibido, segura a navegação — o modal decide o próximo passo.
          const modalMostrado = await verificarModalUpgrade(user, eraSermaoNovo, totalSermoesUsuario);
          if (modalMostrado) {
            return;
          }

          setTimeout(() => navigate('/'), 1200);
        }
      } catch {
        // Rede indisponível — salva offline abaixo
      }

      if (!salvouOnline) {
        if (id) {
          const local = await getSermaoLocal(id) || {};
          const atualizado = { ...local, ...dadosSermao, id, _synced: false };
          await upsertSermaoLocal(atualizado);
          await enqueueOp('update', id, atualizado);
        } else {
          if (!localIdRef.current || !localIdRef.current.startsWith('local_')) {
            localIdRef.current = gerarIdLocal();
          }
          const novoLocal = {
            ...dadosSermao,
            id: localIdRef.current,
            created_at: agora,
            local_temp_id: localIdRef.current,
            _synced: false,
          };
          await upsertSermaoLocal(novoLocal);
          await enqueueOp('create', localIdRef.current, novoLocal);
        }
        await atualizarPendentes();
        localStorage.removeItem(RASCUNHO_KEY(id));
        mostrarToast('Salvo offline — sincronizará quando conectar', 'offline');
        setTimeout(() => navigate('/'), 1500);
      }

    } catch (error) {
      mostrarToast('Erro ao salvar: ' + error.message, 'erro');
    } finally {
      setLoading(false);
    }
  }

  const restaurarVersao = (versao) => {
    setConteudo(versao.conteudo);
    setTitulo(versao.titulo);
    setReferencia(versao.referencia);
    setMostrarHistorico(false);
    mostrarToast('Versão anterior restaurada!', 'info');
  };

  const formatarHora = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Identifica a variante ativa do modal, usada pro log de dispensa/clique
  const varianteModalAtual = modalUpgrade.tipo === 'fundador' ? 'fundador' : `degrau_${modalUpgrade.degrau}`;

  // ── Bloqueio de criação no limite ──────────────────────────────────────────
  if (!id && !podeCreiarSermao) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center gap-5">
        <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center">
          <Lock size={28} className="text-[#4C1D95]" />
        </div>
        <div>
          <h2 className="font-black text-xl text-slate-800 mb-2">Limite de sermões atingido</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Você está no plano gratuito.. Faça upgrade para ter sermões ilimitados.
          </p>
        </div>
        <button onClick={() => navigate('/upgrade?motivo=limite_sermoes')}
          className="bg-[#4C1D95] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-[#5B21B6] active:scale-95 transition-all">
          Ver planos
        </button>
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white flex flex-col transition-all duration-300 ${telaCheia ? 'fixed inset-x-0 top-0 z-[150]' : 'min-h-screen'}`}
      style={telaCheia ? {
        height: alturaVisivel ? `${alturaVisivel}px` : '100dvh',
        // CORRIGIDO: compensa o deslocamento do viewport visual no iOS Safari
        // quando o teclado abre (visualViewport.offsetTop > 0). Sem isso, o
        // container tinha a altura certa mas ficava na posição errada,
        // deixando espaço em branco entre o conteúdo e o teclado.
        transform: `translateY(${offsetTop}px)`,
      } : undefined}
    >

      <Toast visivel={toast.visivel} tipo={toast.tipo} mensagem={toast.mensagem}
        onFechar={() => setToast(t => ({ ...t, visivel: false }))} />

      <ModalUpgrade
        estado={modalUpgrade}
        onFechar={() => {
          logEventoModal('dispensou', varianteModalAtual);
          setModalUpgrade({ aberto: false, tipo: null, degrau: null });
          navigate('/');
        }}
        onVerPlanos={() => {
          logEventoModal('clicou_plus', varianteModalAtual);
          const motivo = modalUpgrade.tipo === 'fundador' ? 'fundador_para_plus' : `${modalUpgrade.degrau}_sermoes`;
          navigate(`/upgrade?motivo=${motivo}`);
        }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <button onClick={() => navigate(-1)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-slate-700 transition-colors -ml-2">
          <ArrowLeft size={22} />
        </button>

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-sm font-black bg-gradient-to-r from-[#4C1D95] to-[#3A1DB8] bg-clip-text text-transparent uppercase tracking-widest">
            {id ? 'Editar Mensagem' : 'Novo Sermão'}
          </h1>
          {!isOnline && (
            <div className="flex items-center gap-1 text-amber-500">
              <WifiOff size={10} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Offline</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setTelaCheia(t => !t)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors">
            {telaCheia ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {historico.length > 0 && (
            <button onClick={() => setMostrarHistorico(true)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-[#4C1D95] transition-colors">
              <RotateCcw size={18} />
            </button>
          )}
          <button onClick={salvar} disabled={loading}
            className="bg-[#4C1D95] text-white p-3 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 hover:bg-[#5B21B6] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </button>
        </div>
      </div>

      {/* Título e referência */}
      <div className="px-6 pt-5 shrink-0">
        <input type="text" placeholder="Título da pregação..."
          className="w-full text-2xl font-black border-none outline-none mb-3 placeholder:text-gray-200 focus:ring-0 text-slate-800"
          value={titulo} onChange={e => setTitulo(e.target.value)} />

        {/* ── Indicador de tipo guiado ── */}
        {tipo && !id && (
          <p className="text-[11px] text-[#4C1D95] font-bold mb-2">
            Estrutura pronta para{' '}
            {tipo === 'expositivo' ? 'sermão expositivo'
              : tipo === 'tematico' ? 'sermão temático'
              : 'devocional'}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4 text-[#4C1D95] bg-purple-50 p-3 rounded-2xl">
          <Book size={16} className="shrink-0" />
          <input type="text" placeholder="Referência Bíblica (ex: João 3:16)"
            className="text-sm font-bold border-none outline-none w-full bg-transparent focus:ring-0"
            value={referencia} onChange={e => setReferencia(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 mb-3 p-1 bg-slate-50 rounded-xl border border-slate-100 w-fit">
          <BotaoToolbar onClick={() => aplicarFormatacao('**', '**')} title="Negrito"><Bold size={16} /></BotaoToolbar>
          <BotaoToolbar onClick={() => aplicarFormatacao('*', '*')} title="Itálico"><Italic size={16} /></BotaoToolbar>
          <BotaoToolbar onClick={() => aplicarFormatacao('> ', '')} title="Citação"><Quote size={16} /></BotaoToolbar>
          <BotaoToolbar onClick={() => aplicarFormatacao('==', '==')} title="Destaque" active><Highlighter size={16} /></BotaoToolbar>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 px-6 overflow-hidden min-h-0">
        <textarea ref={textAreaRef}
          placeholder={
            tipo === 'expositivo'
              ? 'Desenvolva o texto bíblico aqui...'
              : tipo === 'tematico'
              ? 'Desenvolva o tema aqui...'
              : tipo === 'devocional'
              ? 'Escreva sua reflexão...'
              : 'Escreva a mensagem aqui...'
          }
          className="w-full h-full border-none outline-none resize-none text-slate-700 leading-relaxed text-base focus:ring-0 pb-4"
          value={conteudo} onChange={e => setConteudo(e.target.value)} />
      </div>

      {/* Rodapé */}
      <div
        className="px-6 py-3 border-t border-slate-50 flex items-center justify-between shrink-0 gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <AlignLeft size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{metricas.palavras} palavras</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">~{metricas.minutos} min</span>
          </div>
        </div>

        {/* CORRIGIDO: !isPlus → !isAssinante, pelo mesmo motivo do gatilho acima */}
        {!isAssinante && sermoesRestantes !== null && sermoesRestantes <= 10 && (
          <button onClick={() => navigate('/upgrade?motivo=limite_sermoes')} className="flex items-center gap-1.5 text-amber-500 shrink-0">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentualUso}%` }} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">{sermoesRestantes} restantes</span>
          </button>
        )}

        <div className={`flex items-center gap-1.5 shrink-0 transition-opacity duration-500 ${autoSaveAtivo ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest whitespace-nowrap">Rascunho salvo</span>
        </div>
      </div>

      {/* Modal histórico */}
      {mostrarHistorico && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarHistorico(false)} />
          <div
            className="relative bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                <RotateCcw size={14} className="text-[#4C1D95]" /> Histórico de Versões
              </h3>
              <button onClick={() => setMostrarHistorico(false)} className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-300 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
              {historico.map((versao, i) => (
                <button key={i} onClick={() => restaurarVersao(versao)} className="w-full p-5 text-left hover:bg-purple-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{versao.titulo || 'Sem título'}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{versao.conteudo?.substring(0, 80)}...</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[9px] font-bold text-slate-300 uppercase block">{formatarHora(versao.savedAt)}</span>
                      <span className="text-[9px] text-[#4C1D95] font-bold mt-1 block">Restaurar →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[9px] text-slate-300 text-center font-bold uppercase tracking-widest">Versões salvas localmente · Últimas 5</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;