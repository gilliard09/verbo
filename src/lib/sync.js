/**
 * sync.js — Motor de sincronização bidirecional
 */

import { supabase } from '../supabaseClient';
import {
  getQueue, dequeueOp,
  upsertSermoesLocais, upsertSermaoLocal, deleteSermaoLocal,
  getSermaoLocal,
} from './db';

const SERMOES_CACHE = 15;

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
  const fila = await getQueue();
  if (fila.length === 0) return { sincronizados: 0, erros: 0 };

  // getSession lê do cache local — funciona mesmo com rede instável
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { sincronizados: 0, erros: 0 };

  let sincronizados = 0;
  let erros = 0;

  for (const item of fila) {
    try {
      await processarItem(item, session.user.id);
      await dequeueOp(item.queue_id);
      sincronizados++;
    } catch (err) {
      console.warn(`[Verbo Sync] Falha ao processar op ${item.operacao}:`, err.message);
      erros++;
    }
  }

  return { sincronizados, erros };
}

async function processarItem(item, userId) {
  const { operacao, local_id, payload } = item;

  if (operacao === 'delete') {
    if (!local_id.startsWith('local_')) {
      const { error } = await supabase.from('sermoes').delete().eq('id', local_id);
      if (error) throw error;
    }
    return;
  }

  if (operacao === 'create') {
    const { local_temp_id, _synced, updated_at, id: _id, ...dadosLimpos } = payload;
    const { data, error } = await supabase
      .from('sermoes')
      .insert([{ ...dadosLimpos, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    await deleteSermaoLocal(local_id);
    await upsertSermaoLocal({ ...data, _synced: true });
    return;
  }

  if (operacao === 'update') {
    const { _synced, updated_at, local_temp_id, ...dadosLimpos } = payload;
    const { error } = await supabase
      .from('sermoes')
      .update(dadosLimpos)
      .eq('id', local_id);
    if (error) throw error;
    const local = await getSermaoLocal(local_id);
    if (local) await upsertSermaoLocal({ ...local, _synced: true });
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────────────
export function gerarIdLocal() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}