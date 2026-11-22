/**
 * sync.js — Motor de sincronização bidirecional
 */

import { supabase } from '../supabaseClient';
import {
  getQueue, dequeueOp, atualizarPayloadFila,
  upsertSermoesLocais, upsertSermaoLocal, deleteSermaoLocal,
  getSermaoLocal,
} from './db';

const SERMOES_CACHE = 20;
let processamentoEmAndamento = null;

export function gerarUuidRemoto() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Cria um sermão com UUID definido pelo cliente.
 * Se a primeira resposta se perder depois do INSERT, a repetição encontra
 * o mesmo registro pelo UUID e atualiza esse registro, em vez de duplicá-lo.
 */
export async function criarSermaoIdempotente(dados, userId, remoteId) {
  if (!remoteId) throw new Error('Identificador remoto ausente para criação do sermão.');

  const registro = { ...dados, id: remoteId, user_id: userId };
  const { data, error } = await supabase
    .from('sermoes')
    .insert(registro)
    .select()
    .single();

  if (!error) return data;
  if (error.code !== '23505') throw error;

  // Conflito de chave: pode ser a confirmação perdida de uma tentativa anterior.
  // Só reutilizamos o registro se ele pertencer ao usuário autenticado.
  const { data: existente, error: erroBusca } = await supabase
    .from('sermoes')
    .select('*')
    .eq('id', remoteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (erroBusca) throw erroBusca;
  if (!existente) throw error;

  const { data: atualizado, error: erroAtualizacao } = await supabase
    .from('sermoes')
    .update(dados)
    .eq('id', remoteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (erroAtualizacao) throw erroAtualizacao;
  return atualizado;
}

// ─── DOWNLOAD ─────────────────────────────────────────────────────────────────
export async function downloadSermoes(userId) {
  try {
    const { data, error } = await supabase
      .from('sermoes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(SERMOES_CACHE);

    if (error) throw error;
    if (data && data.length > 0) await upsertSermoesLocais(data);
    return data ?? [];
  } catch (err) {
    console.warn('[Verbo Sync] Download falhou:', err.message);
    return null;
  }
}

// ─── UPLOAD (processa fila) ───────────────────────────────────────────────────
export async function processarFila() {
  // Um único processador por aba: Dashboard, editor e hook não executam
  // a mesma fila em paralelo.
  if (processamentoEmAndamento) return processamentoEmAndamento;

  processamentoEmAndamento = executarFila();
  try {
    return await processamentoEmAndamento;
  } finally {
    processamentoEmAndamento = null;
  }
}

async function executarFila() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { sincronizados: 0, erros: 0 };

  let sincronizados = 0;
  let erros = 0;
  const tentadas = new Set();

  // Reconsulta a fila para capturar alterações feitas enquanto uma operação
  // estava em trânsito. Cada versão (token) é tentada no máximo uma vez por ciclo.
  while (true) {
    const fila = await getQueue(session.user.id);
    const novas = fila.filter(item => !tentadas.has(item._queue_token || String(item.queue_id)));
    if (novas.length === 0) break;

    for (let item of novas) {
      const tokenTentado = item._queue_token || String(item.queue_id);
      tentadas.add(tokenTentado);

      try {
        if (item.operacao === 'create' && !item.payload?.remote_id) {
          const remoteId = gerarUuidRemoto();
          const atualizado = await atualizarPayloadFila(
            item.queue_id,
            item._queue_token,
            { ...item.payload, remote_id: remoteId }
          );
          if (!atualizado) continue;
          item = atualizado;
        }

        const resultado = await processarItem(item, session.user.id);
        const removida = await dequeueOp(item.queue_id, item._queue_token);

        // Só confirma o cache local se a mesma versão da operação saiu da fila.
        // Se houve uma edição durante a requisição, a nova versão permanece
        // pendente e o cache local não pode ser marcado como sincronizado.
        if (removida && resultado?.tipo === 'create') {
          await deleteSermaoLocal(item.local_id);
          await upsertSermaoLocal({ ...resultado.data, _synced: true });
        } else if (removida && resultado?.tipo === 'update') {
          const local = await getSermaoLocal(item.local_id);
          if (local) {
            await upsertSermaoLocal({
              ...local,
              updated_at: resultado.updated_at || new Date().toISOString(),
              _synced: true,
            });
          }
        }

        if (removida) sincronizados++;
      } catch (err) {
        console.warn(`[Verbo Sync] Falha ao processar op ${item.operacao}:`, err.message);
        erros++;
      }
    }
  }

  return { sincronizados, erros };
}

async function processarItem(item, userId) {
  const { operacao, local_id, payload = {} } = item;

  if (operacao === 'delete') {
    if (!String(local_id).startsWith('local_')) {
      const { error } = await supabase
        .from('sermoes')
        .delete()
        .eq('id', local_id)
        .eq('user_id', userId);
      if (error) throw error;
    }
    return;
  }

  if (operacao === 'create') {
    const {
      local_temp_id, remote_id, _synced, updated_at, id: _id,
      user_id: _userId, ...dadosLimpos
    } = payload;
    const remoteId = remote_id || gerarUuidRemoto();
    const data = await criarSermaoIdempotente(dadosLimpos, userId, remoteId);
    return { tipo: 'create', data };
  }

  if (operacao === 'update') {
    const {
      _synced, updated_at, local_temp_id, remote_id, id: _id,
      user_id: _userId, ...dadosLimpos
    } = payload;
    const { data, error } = await supabase
      .from('sermoes')
      .update(dadosLimpos)
      .eq('id', local_id)
      .eq('user_id', userId)
      .select('id,updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Sermão não encontrado para atualização. A operação foi mantida na fila.');

    return { tipo: 'update', updated_at: data.updated_at };
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────────────
export function gerarIdLocal() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
