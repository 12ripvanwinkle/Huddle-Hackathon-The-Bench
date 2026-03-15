import { supabase } from './supabase';

export const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createSession = async (sessionName, hostId, radius) => {
  const code = generateInviteCode();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ id: code, name: sessionName, host_id: hostId, radius, active: true })
    .select()
    .single();
  if (error) throw error;
  await supabase.from('session_members').insert({ session_id: code, user_id: hostId, status: 'safe' });
  return data;
};

export const joinSession = async (sessionCode, userId) => {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionCode.toUpperCase())
    .eq('active', true)
    .single();
  if (error || !session) throw new Error('Session not found or already ended.');
  await supabase.from('session_members').upsert({ session_id: sessionCode.toUpperCase(), user_id: userId, status: 'safe' });
  return session;
};

export const leaveSession = async (sessionId, userId) => {
  await supabase
    .from('session_members')
    .update({ status: 'left' })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
};

export const endSession = async (sessionId) => {
  await supabase
    .from('sessions')
    .update({ active: false })
    .eq('id', sessionId);
};

export const subscribeToSession = (sessionId, onUpdate) => {
  return supabase
    .channel(`session:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'session_members', filter: `session_id=eq.${sessionId}` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
};

export const getSessionMembers = async (sessionId) => {
  const { data, error } = await supabase
    .from('session_members')
    .select(`*, profiles(username, avatar_initials)`)
    .eq('session_id', sessionId)
    .neq('status', 'left');
  if (error) throw error;
  return data;
};

export const formatDistance = (meters) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
};