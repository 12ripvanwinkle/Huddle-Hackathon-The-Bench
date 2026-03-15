import { supabase } from './supabase';

export const postSessionAlert = async ({
  sessionId,
  userId,
  username,
  type,
  severity,
  message,
  emoji,
}) => {
  const payload = {
    session_id: sessionId,
    user_id: userId,
    username: username || 'Member',
    type: type || 'info',
    severity: severity || 'info',
    message: message || '',
    emoji: emoji || '',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('session_alerts').insert(payload);
  if (error) throw error;
};

export const subscribeToSessionAlerts = (sessionId, onInsert) => {
  return supabase
    .channel(`session_alerts:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_alerts',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
};

