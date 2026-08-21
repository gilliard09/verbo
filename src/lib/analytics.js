import { supabase } from '../supabaseClient';

// Gera/recupera um session_id estável durante a sessão do navegador
function getSessionId() {
  let sessionId = sessionStorage.getItem('verbo_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('verbo_session_id', sessionId);
  }
  return sessionId;
}

const EVENT_TYPES = {
  signup: 'aquisicao',
  login: 'aquisicao',
  onboarding_completed: 'aquisicao',
  first_sermon_created: 'ativacao',
  sermon_created: 'ativacao',
  sermon_edited: 'ativacao',
  sermon_opened: 'ativacao',
  sermon_deleted: 'ativacao',
  dashboard_viewed: 'uso',
  editor_opened: 'uso',
  pulpit_mode_opened: 'uso',
  bible_opened: 'uso',
  devotional_opened: 'uso',
  sermon_exported: 'uso',
};

export async function track(eventName, metadata = {}) {
  const eventType = EVENT_TYPES[eventName];
  if (!eventType) {
    console.warn(`[analytics] evento desconhecido: ${eventName}`);
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('events').insert({
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      event_name: eventName,
      event_type: eventType,
      page: window.location.pathname,
      metadata,
    });

    if (error) console.error('[analytics] falha ao registrar evento:', error);
  } catch (err) {
    console.error('[analytics] erro inesperado no track:', err);
  }
}