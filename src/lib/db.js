/**
 * db.js — Camada de persistência offline do Verbo
 *
 * Dois object stores:
 *   sermoes_local  → cópia local dos sermões (espelho do Supabase)
 *   sync_queue     → operações pendentes enquanto offline (create/update/delete)
 *
 * Usa a lib `idb` (já incluída pelo Workbox / VitePWA).
 * Se preferir sem dependência, troca openDB por uma promise wrapper nativa.
 */

import { openDB } from 'idb';

const DB_NAME    = 'verbo_offline';
const DB_VERSION = 1;

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

// ─── SERMÕES LOCAIS ───────────────────────────────────────────────────────────

/** Retorna todos os sermões do usuário, ordenados por data de criação desc */
export async function getSermoesLocais(userId) {
  const db = await getDB();
  const todos = await db.getAllFromIndex('sermoes_local', 'user_id', userId);
  return todos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/** Retorna um sermão pelo id */
export async function getSermaoLocal(id) {
  const db = await getDB();
  return db.get('sermoes_local', id);
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
  await Promise.all([
    ...sermoes.map(s => tx.store.put({ ...s, _synced: true })),
    tx.done,
  ]);
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
  const db = await getDB();

  // Se já existe uma operação pendente para este id + tipo, substitui
  const existentes = await db.getAllFromIndex('sync_queue', 'local_id', localId);
  const mesmaTipo  = existentes.find(e => e.operacao === operacao);

  if (mesmaTipo) {
    // Atualiza o payload em vez de duplicar
    await db.put('sync_queue', {
      ...mesmaTipo,
      payload,
      criado_em: new Date().toISOString(),
    });
  } else {
    await db.add('sync_queue', {
      operacao,
      local_id: localId,
      payload,
      criado_em: new Date().toISOString(),
    });
  }
}

/** Retorna todas as operações pendentes, em ordem de inserção */
export async function getQueue() {
  const db = await getDB();
  return db.getAll('sync_queue');
}

/** Remove uma operação da fila após sync bem-sucedido */
export async function dequeueOp(queueId) {
  const db = await getDB();
  await db.delete('sync_queue', queueId);
}

/** Quantidade de operações pendentes */
export async function countQueue() {
  const db = await getDB();
  return db.count('sync_queue');
}