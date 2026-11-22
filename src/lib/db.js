/**
 * db.js — Camada de persistência offline do Verbo
 *
 * Três object stores:
 *   sermoes_local  → cópia local dos sermões (espelho do Supabase)
 *   sermoes_drafts → rascunhos em edição, ainda não confirmados para sincronização
 *   sync_queue     → operações pendentes enquanto offline (create/update/delete)
 *
 * Usa a lib `idb` (já incluída pelo Workbox / VitePWA).
 * Se preferir sem dependência, troca openDB por uma promise wrapper nativa.
 */

import { openDB } from 'idb';

const DB_NAME    = 'verbo_offline';
const DB_VERSION = 3;

// ─── Abre / inicializa o banco ────────────────────────────────────────────────
let _db = null;

export async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sermões locais
      if (!db.objectStoreNames.contains('sermoes_local')) {
        const store = db.createObjectStore('sermoes_local', { keyPath: 'id' });
        store.createIndex('user_id',    'user_id',    { unique: false });
        store.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Rascunhos em edição: separados dos sermões sincronizados e da fila.
      // Assim, autosave local não dispara uma sincronização antes do usuário salvar.
      if (!db.objectStoreNames.contains('sermoes_drafts')) {
        db.createObjectStore('sermoes_drafts', { keyPath: 'draft_id' });
      }

      // Fila de operações pendentes
      if (!db.objectStoreNames.contains('sync_queue')) {
        const q = db.createObjectStore('sync_queue', {
          keyPath: 'queue_id',
          autoIncrement: true,
        });
        q.createIndex('local_id', 'local_id', { unique: false });
      }
    },
  });

  return _db;
}

/** Solicita ao navegador proteção contra limpeza automática do IndexedDB. */
export async function solicitarArmazenamentoPersistente() {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, persisted: false };
  }

  try {
    if (typeof navigator.storage.persisted === 'function') {
      const jaPersistente = await navigator.storage.persisted();
      if (jaPersistente) return { supported: true, persisted: true };
    }

    if (typeof navigator.storage.persist !== 'function') {
      return { supported: false, persisted: false };
    }

    const persistido = await navigator.storage.persist();
    return { supported: true, persisted: persistido };
  } catch (error) {
    console.warn('[Offline] Não foi possível solicitar armazenamento persistente:', error);
    return { supported: true, persisted: false, error };
  }
}

// ─── SERMÕES LOCAIS ───────────────────────────────────────────────────────────

/** Retorna todos os sermões do usuário, ordenados por data de criação desc */
export async function getSermoesLocais(userId) {
  const db = await getDB();
  const todos = await db.getAllFromIndex('sermoes_local', 'user_id', userId);
  return todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/** Retorna um sermão pelo id, validando a conta quando informada. */
export async function getSermaoLocal(id, userId = null) {
  const db = await getDB();
  const sermao = await db.get('sermoes_local', id);
  if (!sermao) return null;
  if (userId && sermao.user_id !== userId) return null;
  return sermao;
}

/** Salva (upsert) um sermão localmente */
export async function upsertSermaoLocal(sermao) {
  const db = await getDB();
  await db.put('sermoes_local', {
    ...sermao,
    _synced: sermao._synced ?? true, // true = já existe no Supabase
  });
}

/** Salva vários sermões de uma vez (usado na sincronização inicial) */
export async function upsertSermoesLocais(sermoes) {
  const db = await getDB();
  const tx = db.transaction('sermoes_local', 'readwrite');

  for (const sermao of sermoes) {
    const local = await tx.store.get(sermao.id);
    // Qualquer edição pendente tem prioridade até a fila conseguir sincronizá-la.
    // Não dependemos do relógio do dispositivo para decidir se ela é mais nova.
    if (local && local._synced === false) continue;
    await tx.store.put({ ...sermao, _synced: true });
  }

  await tx.done;
}

/** Remove do cache remoto os sermões antigos que não fazem parte do lote recente.
 * Alterações locais ainda não sincronizadas são preservadas.
 */
export async function pruneSermoesLocais(userId, keepIds = []) {
  if (!userId) return;
  const db = await getDB();
  const tx = db.transaction('sermoes_local', 'readwrite');
  const keep = new Set(keepIds);
  const locais = await tx.store.index('user_id').getAll(userId);

  for (const sermao of locais) {
    if (sermao._synced !== false && !keep.has(sermao.id)) {
      await tx.store.delete(sermao.id);
    }
  }

  await tx.done;
}

/** Remove um sermão local pelo id */
export async function deleteSermaoLocal(id) {
  const db = await getDB();
  await db.delete('sermoes_local', id);
}

// ─── FILA DE SINCRONIZAÇÃO ────────────────────────────────────────────────────

/**
 * Adiciona uma operação à fila.
 * @param {'create'|'update'|'delete'} operacao
 * @param {string} localId  — id local do sermão (uuid gerado offline ou id do Supabase)
 * @param {object} payload  — dados do sermão (vazio para delete)
 */
export async function enqueueOp(operacao, localId, payload = {}) {
  if (!['create', 'update', 'delete'].includes(operacao)) {
    throw new Error(`Operação de sincronização inválida: ${operacao}`);
  }
  if (!localId) throw new Error('local_id é obrigatório para enfileirar uma operação');

  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const existentes = await store.index('local_id').getAll(localId);
  const ordenadas = existentes.sort((a, b) => a.queue_id - b.queue_id);
  const ultima = ordenadas[ordenadas.length - 1];

  // Uma única intenção pendente por sermão. O estado final substitui
  // combinações anteriores, evitando create/update/delete concorrentes.
  let proxima = null;
  const agora = new Date().toISOString();
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  if (operacao === 'delete') {
    // Um sermão criado offline e ainda não enviado pode simplesmente
    // desaparecer: não existe registro remoto para excluir.
    const createPendente = ordenadas.some(item => item.operacao === 'create');
    if (!(createPendente && String(localId).startsWith('local_'))) {
      proxima = {
        ...(ultima || {}),
        operacao: 'delete',
        local_id: localId,
        payload: {},
        criado_em: ultima?.criado_em || agora,
        atualizado_em: agora,
        _queue_token: token,
      };
    }
  } else if (operacao === 'create') {
    proxima = {
      ...(ultima || {}),
      operacao: 'create',
      local_id: localId,
      payload,
      criado_em: ultima?.criado_em || agora,
      atualizado_em: agora,
      _queue_token: token,
    };
  } else {
    const createPendente = ordenadas.some(item => item.operacao === 'create');
    const deletePendente = ordenadas.some(item => item.operacao === 'delete');

    // Delete é terminal: uma edição posterior não ressuscita o registro.
    if (deletePendente) {
      // Preserva a exclusão já enfileirada; não a remove nem a substitui
      // por uma atualização posterior.
      proxima = {
        ...ordenadas.find(item => item.operacao === 'delete'),
        atualizado_em: agora,
        _queue_token: token,
      };
    } else {
      const createAnterior = ordenadas.find(item => item.operacao === 'create');
      proxima = {
        ...(ultima || {}),
        operacao: createPendente ? 'create' : 'update',
        local_id: localId,
        payload: createPendente
          ? { ...payload, remote_id: payload?.remote_id || createAnterior?.payload?.remote_id }
          : payload,
        criado_em: ultima?.criado_em || agora,
        atualizado_em: agora,
        _queue_token: token,
      };
    }
  }

  for (const item of ordenadas) {
    await store.delete(item.queue_id);
  }
  if (proxima) {
    // Toda operação nova fica vinculada à conta que a criou.
    proxima.user_id = payload?.user_id || ultima?.user_id || null;
    await store.add(proxima);
  }
  await tx.done;
}

/** Retorna operações pendentes; quando informado, restringe à conta autenticada. */
export async function getQueue(userId = null) {
  const db = await getDB();
  const fila = await db.getAll('sync_queue');
  if (!userId) return fila;
  return fila.filter(item => item.user_id === userId || item.payload?.user_id === userId);
}

/** Remove uma operação da fila após sync bem-sucedido */
export async function dequeueOp(queueId, expectedToken) {
  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const atual = await store.get(queueId);

  // Não apaga uma operação que foi atualizada enquanto o sync estava
  // processando uma versão anterior dela.
  const removida = Boolean(atual && (expectedToken === undefined || atual._queue_token === expectedToken));
  if (removida) await store.delete(queueId);
  await tx.done;
  return removida;
}

/**
 * Atualiza o payload de uma operação sem alterar sua identidade na fila.
 * Usado para atribuir um UUID remoto estável a operações antigas de criação.
 */
export async function atualizarPayloadFila(queueId, expectedToken, payload) {
  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const atual = await store.get(queueId);

  if (!atual || (expectedToken !== undefined && atual._queue_token !== expectedToken)) {
    await tx.done;
    return null;
  }

  const atualizado = { ...atual, payload };
  await store.put(atualizado);
  await tx.done;
  return atualizado;
}

/** Quantidade de operações pendentes da conta informada. */
export async function countQueue(userId = null) {
  if (userId) return (await getQueue(userId)).length;
  const db = await getDB();
  return db.count('sync_queue');
}

/* ─── RASCUNHOS DO EDITOR ─────────────────────────────────────────────────── */

/** Lê um rascunho por chave composta de usuário + sermão (ou "novo"). */
export async function getRascunhoLocal(draftId) {
  const db = await getDB();
  return db.get('sermoes_drafts', draftId);
}

/** Persiste o estado de edição sem marcar o sermão como pendente de sync. */
export async function upsertRascunhoLocal(rascunho) {
  const db = await getDB();
  await db.put('sermoes_drafts', {
    ...rascunho,
    savedAt: rascunho.savedAt || new Date().toISOString(),
  });
}

/** Remove o rascunho depois que o usuário confirma o salvamento do sermão. */
export async function deleteRascunhoLocal(draftId) {
  if (!draftId) return;
  const db = await getDB();
  await db.delete('sermoes_drafts', draftId);
}
