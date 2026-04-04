/**
 * useOfflineSermons.js
 *
 * Ponte de compatibilidade entre leitura.jsx e a camada db.js.
 * Exporta salvarOffline e buscarOffline que o leitura.jsx já importa.
 */

import { upsertSermaoLocal, getSermaoLocal } from '../lib/db';

/**
 * Salva um sermão no IndexedDB para acesso offline.
 * Chamado automaticamente quando o leitura.jsx carrega um sermão online.
 */
export async function salvarOffline(sermao) {
  if (!sermao?.id) return;
  await upsertSermaoLocal({ ...sermao, _synced: true });
}

/**
 * Busca um sermão do IndexedDB pelo id.
 * Retorna null se não encontrado.
 */
export async function buscarOffline(id) {
  if (!id) return null;
  return getSermaoLocal(id) ?? null;
}