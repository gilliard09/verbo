import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { track } from '../lib/analytics';
import { supabase } from '../supabaseClient';
import {
  Save, ArrowLeft, Book, Loader2,
  Bold, Italic, Quote, Highlighter, CheckCircle2,
  Clock, AlignLeft, RotateCcw, FileUp,
  AlertTriangle, X, Lock, WifiOff, Sparkles, ArrowRight, Undo2, Redo2,
} from 'lucide-react';

// ── Offline layer ──────────────────────────────────────────────────────────────
import { getSermaoLocal, upsertSermaoLocal, enqueueOp, getRascunhoLocal, upsertRascunhoLocal, deleteRascunhoLocal } from '../lib/db';
import { gerarIdLocal, gerarUuidRemoto, criarSermaoIdempotente } from '../lib/sync';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { usePlano } from '../hooks/usePlano';
import { importarArquivoSermao } from '../lib/importarSermao';

const PALAVRAS_POR_MINUTO = 120;
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

// Recursos da Academia Verbo mostrados no convite de upgrade do Essencial —
// Essencial não é o destino, é o primeiro degrau. Esse modal é independente
// do fluxo de degraus acima: dispara pra quem já é assinante Essencial,
// focado em cursos (o que o Essencial não tem acesso), não em "sermões
// ilimitados" (que ele já tem).
const RECURSOS_ACADEMIA = [
  'Teologia Fundamental',
  'Método Pregação Impactante',
  'Novo Testamento Explicado',
  'Discipulado Cristão',
  'Sermões ilimitados',
];

// ─── Tiptap: marca de destaque compatível com o formato Markdown legado ────
const HighlightMark = Mark.create({
  name: 'highlight',
  parseHTML() { return [{ tag: 'mark' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: 'verbo-highlight' }), 0];
  },
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const markdownToEditorHtml = (markdown = '') => {
  const source = String(markdown).replace(/\r\n?/g, '\n');
  if (!source.trim()) return '<p></p>';
  const inline = (value) => escapeHtml(value)
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return source.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every(line => /^>\s?/.test(line))) {
      return '<blockquote><p>' + lines.map(line => inline(line.replace(/^>\s?/, ''))).join('<br>') + '</p></blockquote>';
    }
    if (lines.every(line => /^[-*+]\s/.test(line))) {
      return '<ul>' + lines.map(line => '<li><p>' + inline(line.replace(/^[-*+]\s/, '')) + '</p></li>').join('') + '</ul>';
    }
    if (lines.every(line => /^\d+\.\s/.test(line))) {
      return '<ol>' + lines.map(line => '<li><p>' + inline(line.replace(/^\d+\.\s/, '')) + '</p></li>').join('') + '</ol>';
    }
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
};

const editorHtmlToMarkdown = (html = '') => {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const render = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(render).join('');
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return '**' + inner + '**';
    if (tag === 'em' || tag === 'i') return '*' + inner + '*';
    if (tag === 'mark') return '==' + inner + '==';
    if (tag === 'blockquote') return inner.replace(/\n+$/, '').split('\n').map(line => line ? '> ' + line : '>').join('\n') + '\n\n';
    if (tag === 'li') return inner.trim() + '\n';
    if (tag === 'ul') return Array.from(node.children).map(child => '- ' + render(child).trim()).join('\n') + '\n\n';
    if (tag === 'ol') return Array.from(node.children).map((child, index) => (index + 1) + '. ' + render(child).trim()).join('\n') + '\n\n';
    if (tag === 'p' || /^h[1-6]$/.test(tag)) return inner + '\n\n';
    return inner;
  };
  return Array.from(doc.body.childNodes).map(render).join('')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

// ─── Teclado iOS: altura real da viewport visual ──────────────────────────────
const useKeyboardInset = () => {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const viewport = window.visualViewport;
    const update = () => {
      const inset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;
      document.documentElement.style.setProperty('--kb', inset + 'px');
      setKeyboardOpen(current => current === (inset > 120) ? current : inset > 120);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.style.setProperty('--kb', '0px');
    };
  }, []);
  return keyboardOpen;
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
// `estado.tipo === 'fundador'` → usuário já assinante Essencial, convite
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
              Continuar como Essencial
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
    type="button"
    onPointerDown={(event) => event.preventDefault()}
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all active:scale-95 touch-manipulation ${
      active ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-purple-50'
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
  const editorScrollRef = useRef(null);
  const isApplyingEditorContentRef = useRef(false);
  const keyboardOpen = useKeyboardInset();

  // O documento usa a rolagem nativa do navegador. Não criamos um scroll
  // interno nem alteramos o overscroll global do body.
  // ── Tipo via URL ─────────────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const tipo   = params.get('tipo');

  // ── CORREÇÃO (Essencial vs Plus) ─────────────────────────────────────────
  // Antes usávamos só `isPlus` para decidir se mostra o modal/indicador de
  // upgrade. Isso é um bug: Essencial é plano PAGO (entrada, R$9,90) mas
  // isPlus = false para ele — então o modal de "vire assinante" continuava
  // aparecendo pra quem já é assinante Essencial. `isAssinante` (Essencial OU
  // Plus) é o conceito certo pro fluxo de degraus (gratuito → pagante).
  // `isEssencial` especificamente é usado agora pro convite Essencial → Plus.
  const {
    isPlus,
    isEssencial,
    isAssinante,
    podeCreiarSermao,
    limiteSermoes,
    sermoesRestantes,
    loading: planoCarregando,
  } = usePlano();

  // NOVO: um único estado cobre as duas famílias de modal (degrau do
  // usuário gratuito e convite Essencial→Plus) — { aberto, tipo, degrau }
  const [modalUpgrade, setModalUpgrade] = useState({ aberto: false, tipo: null, degrau: null });

  const [titulo,     setTitulo]     = useState('');
  const [conteudo,   setConteudo]   = useState('');
  const [referencia, setReferencia] = useState('');
  const [loading,    setLoading]    = useState(false);
  const arquivoImportacaoRef = useRef(null);
  const [importando, setImportando] = useState(false);
  const [previewImportacao, setPreviewImportacao] = useState(null);
  const [autoSaveAtivo, setAutoSaveAtivo] = useState(false);
  const [, setSelectionRevision] = useState(0);
  const autoSaveRef = useRef(null);
  const draftReadyRef = useRef(false);
  const draftKeyRef = useRef(null);
  const [historico,       setHistorico]       = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [toast, setToast] = useState({ visivel: false, tipo: 'info', mensagem: '' });

  // Id local para sermões criados offline
  const localIdRef = useRef(id || null);
  // Mantém a mesma chave entre tentativas de criação, inclusive quando a
  // requisição chega ao Supabase mas a resposta se perde na conexão.
  const remoteIdRef = useRef(null);

  const { isOnline, atualizarPendentes } = useOfflineSync();

  const metricas = useMemo(() => {
    const palavras = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;
    return { palavras, minutos: Math.ceil(palavras / PALAVRAS_POR_MINUTO) };
  }, [conteudo]);

  const editor = useEditor({
    extensions: [StarterKit, HighlightMark],
    content: '<p></p>',
    editable: true,
    editorProps: {
      attributes: {
        class: 'verbo-tiptap prose prose-slate max-w-none outline-none',
        spellcheck: 'true',
        autocapitalize: 'sentences',
        autocomplete: 'off',
      },
      transformPastedHTML: (html) => {
        if (typeof DOMParser === 'undefined') return html;
        const pasted = new DOMParser().parseFromString(html, 'text/html');

        // Mantém o texto e as quebras de parágrafo, sem importar estilos,
        // fontes ou estruturas estranhas de páginas e editores externos.
        const toPlainText = (node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
          if (node.nodeType !== Node.ELEMENT_NODE) return '';
          const tag = node.tagName.toLowerCase();
          if (tag === 'br') return '\n';
          const children = Array.from(node.childNodes).map(toPlainText).join('');
          if (tag === 'li') return '- ' + children.trim() + '\n';
          if (['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            return children.trimEnd() + '\n\n';
          }
          return children;
        };

        const plain = toPlainText(pasted.body)
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (!plain) return '<p></p>';
        return '<p>' + escapeHtml(plain).replace(/\n/g, '<br>') + '</p>';
      },
      transformPastedText: (text) => text.replace(/\r\n?/g, '\n'),
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (!isApplyingEditorContentRef.current) {
        setConteudo(editorHtmlToMarkdown(activeEditor.getHTML()));
      }
    },
    // Atualiza apenas o estado visual da toolbar. A rolagem do cursor fica
    // sob controle do Safari, evitando disputas com o teclado do iOS.
    onSelectionUpdate: () => setSelectionRevision((revision) => revision + 1),
  });

  // Sincroniza carregamento, importação e restauração de histórico sem mudar
  // o formato persistido: o Supabase continua recebendo Markdown como antes.
  useEffect(() => {
    if (!editor) return;
    const atual = editorHtmlToMarkdown(editor.getHTML());
    if (atual === conteudo) return;
    isApplyingEditorContentRef.current = true;
    editor.commands.setContent(markdownToEditorHtml(conteudo), { emitUpdate: false });
    isApplyingEditorContentRef.current = false;
  }, [editor, conteudo]);

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
  //  2) Usuários Essencial: convite pontual pra migrar pro Plus, focado na
  //     Academia Verbo. Independente do fluxo de degraus — dispara mesmo
  //     em edição de sermão existente, não só em criação, porque um
  //     Essencial já ativo pode não criar sermões novos com frequência.
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

      // ── Público 2: Essencial — convite pra virar Plus. Essencial não é
      // o destino, é o primeiro degrau. ──
      if (isEssencial && !perfil?.viu_upgrade_fundador) {
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
  }, [isAssinante, isEssencial, logEventoModal]);

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

  // O foco é iniciado pelo usuário: evita abrir o teclado sem solicitação.\n\n  // ── Analytics: registro de abertura do editor ─────────────────────────────
  useEffect(() => {
    track('editor_opened', { sermon_id: id || null, tipo: tipo || null });
  }, [id, tipo]);

  // ── Carregamento e recuperação de rascunhos ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    draftReadyRef.current = false;

    const inicializar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        draftKeyRef.current = userId ? `${userId}:${id || 'novo'}` : null;

        let draft = draftKeyRef.current
          ? await getRascunhoLocal(draftKeyRef.current)
          : null;

        // Migra automaticamente rascunhos gravados pelo autosave antigo.
        if (!draft) {
          try {
            const legado = localStorage.getItem(RASCUNHO_KEY(id));
            if (legado) {
              const parsed = JSON.parse(legado);
              if (parsed && (parsed.titulo || parsed.conteudo || parsed.referencia)) {
                draft = parsed;
                if (draftKeyRef.current) {
                  await upsertRascunhoLocal({
                    draft_id: draftKeyRef.current,
                    user_id: userId || null,
                    sermon_id: id || null,
                    ...parsed,
                  });
                }
              }
            }
          } catch { /* ignora rascunho legado inválido */ }
        }

        if (cancelled) return;

        if (id) {
          await carregarSermao(id, draft);
        } else if (draft) {
          setTitulo(draft.titulo || '');
          setConteudo(draft.conteudo || '');
          setReferencia(draft.referencia || '');
          const tempo = new Date(draft.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          mostrarToast(`Rascunho recuperado das ${tempo}`, 'info');
        } else if (!tipo) {
          // Compatibilidade: recupera rascunhos criados por versões anteriores.
          const legado = localStorage.getItem(RASCUNHO_KEY(null));
          if (legado) {
            try {
              const { titulo: t, conteudo: c, referencia: r, savedAt } = JSON.parse(legado);
              setTitulo(t || '');
              setConteudo(c || '');
              setReferencia(r || '');
              const tempo = new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              mostrarToast(`Rascunho recuperado das ${tempo}`, 'info');
            } catch { /* rascunho legado inválido */ }
          }
        }

        try {
          const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY(id)) || '[]');
          if (!cancelled) setHistorico(hist);
        } catch { /* silencioso */ }
      } catch (error) {
        console.warn('[Verbo Editor] Não foi possível recuperar o rascunho:', error);
      } finally {
        if (!cancelled) draftReadyRef.current = true;
      }
    };

    inicializar();
    return () => {
      cancelled = true;
      clearTimeout(autoSaveRef.current);
    };
  }, [id, tipo]);

  async function carregarSermao(sermoId, draft = null) {
    // 1. Cache do sermão: leitura local antes de qualquer chamada de rede.
    const local = await getSermaoLocal(sermoId);
    if (local) {
      setTitulo(local.titulo || '');
      setConteudo(local.conteudo || '');
      setReferencia(local.referencia_biblica || '');
    }

    // 2. Rascunho em edição tem prioridade: ainda não foi confirmado pelo usuário.
    if (draft) {
      setTitulo(draft.titulo || '');
      setConteudo(draft.conteudo || '');
      setReferencia(draft.referencia || '');
      const tempo = new Date(draft.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      mostrarToast(`Alterações recuperadas das ${tempo}`, 'info');
      return;
    }

    // O conteúdo local já foi carregado; não precisamos esperar a rede para
    // começar a proteger novas alterações feitas pelo usuário.
    draftReadyRef.current = true;

    // 3. Sem rascunho pendente, busca a versão remota mais recente.
    try {
      const { data, error } = await supabase
        .from('sermoes').select('*').eq('id', sermoId).single();
      if (error) throw error;
      if (data) {
        const localAt  = local ? new Date(local.updated_at || local.created_at || 0) : new Date(0);
        const remotoAt = new Date(data.updated_at || data.created_at || 0);
        if (local?._synced !== false && remotoAt >= localAt) {
          setTitulo(data.titulo || '');
          setConteudo(data.conteudo || '');
          setReferencia(data.referencia_biblica || '');
          await upsertSermaoLocal({ ...data, _synced: true });
        }
      }
    } catch {
      if (!local) mostrarToast('Offline e sem cache local para este sermão', 'erro');
    }
  }

  // ── Autosave local: IndexedDB primeiro, localStorage como compatibilidade ──
  useEffect(() => {
    if (!draftReadyRef.current) return;

    clearTimeout(autoSaveRef.current);
    setAutoSaveAtivo(false);
    autoSaveRef.current = setTimeout(async () => {
      const vazio = !conteudo.trim() && !titulo.trim() && !referencia.trim();
      if (vazio) {
        try {
          if (draftKeyRef.current) await deleteRascunhoLocal(draftKeyRef.current);
          localStorage.removeItem(RASCUNHO_KEY(id));
        } catch { /* limpeza local é best-effort */ }
        return;
      }

      const dados = {
        titulo,
        conteudo,
        referencia,
        savedAt: new Date().toISOString(),
      };

      let salvoNoIndexedDB = false;
      try {
        if (draftKeyRef.current) {
          await upsertRascunhoLocal({
            draft_id: draftKeyRef.current,
            user_id: draftKeyRef.current.split(':')[0],
            sermon_id: id || null,
            ...dados,
          });
          salvoNoIndexedDB = true;
        }
      } catch (error) {
        console.warn('[Verbo Editor] Falha ao persistir no IndexedDB:', error);
      }

      // Cópia legada é best-effort; uma falha no localStorage não invalida o IndexedDB.
      try {
        localStorage.setItem(RASCUNHO_KEY(id), JSON.stringify(dados));
      } catch (error) {
        console.warn('[Verbo Editor] Cópia localStorage indisponível:', error);
      }

      if (salvoNoIndexedDB) {
        setAutoSaveAtivo(true);
        setTimeout(() => setAutoSaveAtivo(false), 2000);
      } else {
        mostrarToast('Não foi possível salvar o rascunho neste dispositivo.', 'erro');
      }
    }, 500);

    return () => clearTimeout(autoSaveRef.current);
  }, [titulo, conteudo, referencia, id]);

  // ── Formatação Tiptap: preserva seleção e histórico de desfazer/refazer ────
  const aplicarFormatacao = useCallback((tipo) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (tipo === 'bold') chain.toggleBold().run();
    if (tipo === 'italic') chain.toggleItalic().run();
    if (tipo === 'quote') chain.toggleBlockquote().run();
    if (tipo === 'highlight') chain.toggleMark('highlight').run();
    if (tipo === 'undo') chain.undo().run();
    if (tipo === 'redo') chain.redo().run();
  }, [editor]);

  // ── Salvar ─────────────────────────────────────────────────────────────────
  async function salvar() {
    if (!titulo.trim()) { mostrarToast('Insira um título para salvar.', 'erro'); return; }
    if (!id && !planoCarregando && !podeCreiarSermao) {
      mostrarToast(`Você atingiu o limite de ${limiteSermoes} sermões do seu plano. Faça upgrade para continuar.`, 'erro', 6000);
      navigate('/upgrade?motivo=limite_sermoes');
      return;
    }
    setLoading(true);
    mostrarToast('Salvando…', 'info', 30000);

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
        let res;
        if (id) {
          res = await supabase
            .from('sermoes')
            .update(dadosSermao)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();
        } else {
          const remoteId = remoteIdRef.current || (remoteIdRef.current = gerarUuidRemoto());
          const data = await criarSermaoIdempotente(dadosSermao, user.id, remoteId);
          res = { data, error: null };
        }

        if (res.error) throw res.error;

        if (!res.error) {
          const idFinal = id || res.data?.id;
          if (idFinal) {
            await upsertSermaoLocal({
              ...dadosSermao,
              id: idFinal,
              created_at: res.data?.created_at || agora,
              updated_at: res.data?.updated_at || agora,
              _synced: true,
            });
          }
          salvouOnline = true;
          if (draftKeyRef.current) {
            try { await deleteRascunhoLocal(draftKeyRef.current); }
            catch (error) { console.warn('[Verbo Editor] Rascunho local não removido:', error); }
          }
          localStorage.removeItem(RASCUNHO_KEY(id));
          mostrarToast('Salvo ✓', 'sucesso');

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
          // Essencial→Plus) numa única checagem. Se algum modal for
          // exibido, segura a navegação — o modal decide o próximo passo.
          const modalMostrado = await verificarModalUpgrade(user, eraSermaoNovo, totalSermoesUsuario);
          if (modalMostrado) {
            return;
          }

          setTimeout(() => navigate('/'), 1200);
        }
      } catch (error) {
        // Limite de plano é uma regra de negócio, não uma falha de conexão.
        // Não colocamos esse sermão na fila offline para evitar tentativas
        // repetidas de sincronização que jamais poderão ser concluídas.
        if (error?.code === 'P0001' || /limite de \d+ sermões/i.test(error?.message || '')) {
          throw error;
        }
        // Falhas de rede continuam usando o fluxo offline existente.
      }

      if (!salvouOnline) {
        if (id) {
          const local = await getSermaoLocal(id) || {};
          const atualizado = { ...local, ...dadosSermao, id, updated_at: agora, _synced: false };
          await upsertSermaoLocal(atualizado);
          await enqueueOp('update', id, atualizado);
        } else {
          if (!localIdRef.current || !localIdRef.current.startsWith('local_')) {
            localIdRef.current = gerarIdLocal();
          }
          const remoteId = remoteIdRef.current || (remoteIdRef.current = gerarUuidRemoto());
          const novoLocal = {
            ...dadosSermao,
            id: localIdRef.current,
            created_at: agora,
            updated_at: agora,
            local_temp_id: localIdRef.current,
            remote_id: remoteId,
            _synced: false,
          };
          await upsertSermaoLocal(novoLocal);
          await enqueueOp('create', localIdRef.current, novoLocal);
        }
        await atualizarPendentes();
        if (draftKeyRef.current) {
          try { await deleteRascunhoLocal(draftKeyRef.current); }
          catch (error) { console.warn('[Verbo Editor] Rascunho local não removido:', error); }
        }
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

  // A importação é exclusiva do Plus. Consultamos o Supabase em cada tentativa,
  // sem confiar no estado em cache do hook usePlano após alterações de plano.
  async function verificarAcessoImportacao() {
    const { data: { user }, error: erroUsuario } = await supabase.auth.getUser();
    if (erroUsuario) throw erroUsuario;
    if (!user) return false;

    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('plano, plano_expira_em')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;

    const planoPlusAtivo = perfil?.plano === 'plus';
    const assinaturaValida = !perfil?.plano_expira_em || new Date(perfil.plano_expira_em) > new Date();
    return planoPlusAtivo && assinaturaValida;
  }

  function abrirImportacao() {
    // O seletor de arquivos precisa ser aberto diretamente no clique do usuário.
    // Se aguardarmos uma chamada assíncrona ao Supabase antes de chamar click(),
    // alguns navegadores bloqueiam a janela por perderem a ativação do usuário.
    // A validação atualizada do plano continua sendo feita em selecionarArquivoImportacao
    // antes de qualquer leitura ou processamento do documento.
    if (!isPlus) {
      navigate('/upgrade?motivo=importacao');
      return;
    }

    arquivoImportacaoRef.current?.click();
  }

  async function selecionarArquivoImportacao(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    setImportando(true);
    try {
      const permitido = await verificarAcessoImportacao();
      if (!permitido) {
        navigate('/upgrade?motivo=importacao');
        return;
      }
      const resultado = await importarArquivoSermao(arquivo);
      setPreviewImportacao(resultado);
    } catch (error) {
      mostrarToast(error.message || 'Não foi possível importar este arquivo.', 'erro', 6000);
    } finally {
      setImportando(false);
    }
  }

  async function confirmarImportacao() {
    if (!previewImportacao) return;
    try {
      const permitido = await verificarAcessoImportacao();
      if (!permitido) {
        setPreviewImportacao(null);
        navigate('/upgrade?motivo=importacao');
        return;
      }
    } catch (error) {
      mostrarToast('Não foi possível validar seu plano. Conecte-se à internet e tente novamente.', 'erro', 6000);
      return;
    }
    const jaExisteConteudo = Boolean(titulo.trim() || conteudo.trim() || referencia.trim());
    if (jaExisteConteudo && !window.confirm('A importação substituirá o título, a referência e o conteúdo atuais deste editor. Deseja continuar?')) return;

    setTitulo(previewImportacao.titulo || titulo);
    setReferencia(previewImportacao.referencia);
    setConteudo(previewImportacao.conteudo);
    setPreviewImportacao(null);
    mostrarToast('Documento importado. Revise e salve seu sermão.', 'sucesso', 4500);
    requestAnimationFrame(() => editor?.commands.focus('end'));
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
  if (!id && !planoCarregando && !podeCreiarSermao) {
    const nomePlanoAtual = isEssencial ? 'Essencial' : 'gratuito';
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center gap-5">
        <div className="w-16 h-16 bg-purple-50 rounded-[24px] flex items-center justify-center">
          <Lock size={28} className="text-[#4C1D95]" />
        </div>
        <div>
          <h2 className="font-black text-xl text-slate-800 mb-2">Limite de sermões atingido</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Você atingiu o limite de {limiteSermoes} sermões do plano {nomePlanoAtual}. Faça upgrade para continuar criando mensagens.
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
    <div className="sermon-editor-page bg-white min-h-[100dvh] w-full max-w-full text-slate-800"
      ref={editorScrollRef}
      style={{ paddingBottom: 'calc(var(--kb, 0px) + 88px + env(safe-area-inset-bottom, 0px))', scrollPaddingBottom: 'calc(var(--kb, 0px) + 88px)' }}>

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

      {/* Prévia da importação: nada é aplicado ao sermão até a confirmação. */}
      {previewImportacao && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6">
          <div className="w-full max-w-2xl max-h-[92dvh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100">
              <div className="min-w-0">
                <h2 className="font-black text-slate-800">Revisar sermão importado</h2>
                <p className="text-xs text-slate-400 mt-1 truncate">{previewImportacao.nomeArquivo} · {previewImportacao.formato}</p>
              </div>
              <button onClick={() => setPreviewImportacao(null)} aria-label="Fechar prévia" className="p-2 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Título do sermão</label>
                <input value={previewImportacao.titulo} onChange={e => setPreviewImportacao(p => ({ ...p, titulo: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-purple-400" placeholder="Título da pregação" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Referência bíblica (opcional)</label>
                <input value={previewImportacao.referencia} onChange={e => setPreviewImportacao(p => ({ ...p, referencia: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-purple-400" placeholder="Ex.: João 3:16" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Conteúdo extraído · você pode revisar antes de importar</label>
                <textarea value={previewImportacao.conteudo} onChange={e => setPreviewImportacao(p => ({ ...p, conteudo: e.target.value }))} rows={12} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-purple-400 resize-y" />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">A importação não usa IA. O texto extraído será inserido no editor somente depois da sua confirmação. Revise quebras de linha e referências antes de salvar.</p>
            </div>
            <div className="flex gap-2 p-5 border-t border-slate-100">
              <button onClick={() => setPreviewImportacao(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancelar</button>
              <button onClick={confirmarImportacao} disabled={!previewImportacao.conteudo.trim()} className="flex-1 py-3 rounded-xl bg-[#4C1D95] text-white font-bold text-sm disabled:opacity-40">Importar no editor</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-[160] flex items-center justify-between p-4 border-b border-slate-100 bg-white/95 backdrop-blur-md"
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
          <input ref={arquivoImportacaoRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={selecionarArquivoImportacao} />
          <button onClick={abrirImportacao} disabled={importando} title="Importar sermão (recurso exclusivo do Plus)" aria-label="Importar sermão (recurso exclusivo do Plus)" className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-all disabled:opacity-50 ${isPlus ? 'text-[#4C1D95] hover:bg-purple-50' : 'text-slate-300 hover:bg-slate-50'}`}>
            {importando ? <Loader2 className="animate-spin" size={19} /> : isPlus ? <FileUp size={19} /> : <Lock size={18} />}
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

      {/* Documento único: título, referência e texto compartilham o scroll da página */}
      <main className="px-6 pt-5 pb-6">
        <input type="text" placeholder="Título da pregação..."
          className="w-full text-[26px] leading-tight font-bold tracking-tight border-none outline-none mb-3 placeholder:text-slate-200 focus:ring-0 text-slate-900"
          value={titulo} onChange={e => setTitulo(e.target.value)} />

        {tipo && !id && (
          <p className="text-[11px] text-[#4C1D95] font-semibold mb-2">
            Estrutura pronta para{' '}
            {tipo === 'expositivo' ? 'sermão expositivo'
              : tipo === 'tematico' ? 'sermão temático'
              : 'devocional'}
          </p>
        )}

        <div className="flex items-center gap-2 mb-5 text-[#4C1D95] bg-purple-50/80 px-3 py-2.5 rounded-xl">
          <Book size={16} className="shrink-0" />
          <input type="text" placeholder="Referência bíblica (ex.: João 3:16)"
            className="text-base font-semibold border-none outline-none w-full bg-transparent focus:ring-0 placeholder:text-purple-300"
            value={referencia} onChange={e => setReferencia(e.target.value)} />
        </div>

        <div
          className="sermon-editor-content text-[18px] leading-[1.75] text-slate-700 min-h-[45vh] cursor-text"
          onClick={() => {
            // O espaço vazio abaixo do último parágrafo também ativa o editor.
            // Se o clique já posicionou o cursor no Tiptap, preservamos a seleção.
            if (editor && !editor.isFocused) editor.commands.focus('end');
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {!keyboardOpen && (
          <div className="mt-8 pt-3 border-t border-slate-100 flex items-center gap-5 text-slate-300">
            <div className="flex items-center gap-1.5">
              <AlignLeft size={13} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{metricas.palavras} palavras</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              <span className="text-[10px] font-bold uppercase tracking-widest">~{metricas.minutos} min</span>
            </div>
            {!isAssinante && sermoesRestantes !== null && sermoesRestantes <= 10 && (
              <button onClick={() => navigate('/upgrade?motivo=limite_sermoes')} className="ml-auto flex items-center gap-1.5 text-amber-500 shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-widest">{sermoesRestantes} restantes</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Toolbar fixa acima do teclado; pointerdown preserva seleção e foco */}
      <div className="sermon-editor-toolbar fixed left-0 right-0 z-[180] border-t border-slate-100 bg-white/95 backdrop-blur-xl px-4 pt-1.5"
        style={{ bottom: 'var(--kb, 0px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-0.5">
            <BotaoToolbar onClick={() => aplicarFormatacao('bold')} title="Negrito" active={editor?.isActive('bold')}><Bold size={18} /></BotaoToolbar>
            <BotaoToolbar onClick={() => aplicarFormatacao('italic')} title="Itálico" active={editor?.isActive('italic')}><Italic size={18} /></BotaoToolbar>
            <BotaoToolbar onClick={() => aplicarFormatacao('quote')} title="Citação" active={editor?.isActive('blockquote')}><Quote size={18} /></BotaoToolbar>
            <BotaoToolbar onClick={() => aplicarFormatacao('highlight')} title="Destaque" active={editor?.isActive('highlight')}><Highlighter size={18} /></BotaoToolbar>
          </div>
          <div className="flex items-center gap-0.5">
            <BotaoToolbar onClick={() => aplicarFormatacao('undo')} title="Desfazer"><Undo2 size={18} /></BotaoToolbar>
            <BotaoToolbar onClick={() => aplicarFormatacao('redo')} title="Refazer"><Redo2 size={18} /></BotaoToolbar>
          </div>
          <div className="absolute right-5 top-[-22px] h-4 min-w-12 text-right">
            <span className={`inline-flex items-center gap-1.5 text-[9px] font-semibold text-green-500 transition-opacity ${autoSaveAtivo ? 'opacity-100' : 'opacity-0'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />Salvo
            </span>
          </div>
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