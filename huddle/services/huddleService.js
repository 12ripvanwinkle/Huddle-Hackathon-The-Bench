import { supabase } from './supabase';

export const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createSession = async (sessionName, hostId, radius = 150, expiresAt = null) => {
  const code = generateInviteCode();
  
  
  const {data: userData} = await supabase.auth.getUser()

  const insertData = {
    id: code,
    name: sessionName,
    host_id: userData.user.id,
    radius,
    active: true,
  };

  if (expiresAt) insertData.expires_at = expiresAt;

  const { data, error } = await supabase
    .from('sessions')
    .insert(insertData)
    .select()
    .maybeSingle();

  if (error) {
    console.log('Session insert error:', error.message, error.code);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  if (!data) throw new Error('Session was not created.');

  await supabase
    .from('session_members')
    .insert({
      session_id: code,
      user_id: userData.user.id,
      status: 'safe',
    });

  return data;
};

export const joinSession = async (sessionCode, userId) => {
  const code = sessionCode.toUpperCase();

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', code)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  if (!session) throw new Error('Session not found or already ended.');
  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    throw new Error('Session expired.');
  }

  const { error: joinError } = await supabase
    .from('session_members')
    .upsert({
      session_id: code,
      user_id: userId,
      status: 'safe',
    });

  if (joinError) throw joinError;
  return session;
};

export const leaveSession = async (sessionId, userId) => {
  const { error } = await supabase
    .from('session_members')
    .update({ status: 'left' })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const endSession = async (sessionId) => {
  const { error } = await supabase
    .from('sessions')
    .update({ active: false })
    .eq('id', sessionId);
  if (error) throw error;
};

export const deleteSession = async (sessionId) => {
  const { error: membersError } = await supabase
    .from('session_members')
    .delete()
    .eq('session_id', sessionId);
  if (membersError) throw membersError;

  const { error: sessionError } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);
  if (sessionError) throw sessionError;
};

export const endAndDeleteSession = async (sessionId) => {
  // Mark inactive first so members receive an UPDATE before deletion.
  await endSession(sessionId);
  await deleteSession(sessionId);
};

export const updateSessionRadius = async (sessionId, newRadius) => {
  const { error } = await supabase
    .from('sessions')
    .update({ radius: newRadius })
    .eq('id', sessionId);
  if (error) throw error;
};

export const subscribeToSession = (sessionId, onMemberUpdate, onSessionUpdate) => {
  const channel = supabase.channel(`session:${sessionId}`);
  
  // Subscribe to member updates
  if (onMemberUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_members',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onMemberUpdate(payload.new)
    );
  }
  
  // Subscribe to session updates (for radius changes)
  if (onSessionUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => onSessionUpdate(payload.new)
    );
  }
  
  return channel.subscribe();
};

export const getSessionMembers = async (sessionId) => {
  const { data, error } = await supabase
    .from('session_members')
    .select(`
      *,
      profiles (
        username,
        avatar_initials
      )
    `)
    .eq('session_id', sessionId)
    .neq('status', 'left');
  if (error) throw error;
  return data;
};

export const formatDistance = (meters) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
};

export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
