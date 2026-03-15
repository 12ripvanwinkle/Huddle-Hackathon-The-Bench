import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});




export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getProfileBasic(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_initials, avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}


export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  if (error) throw error;
  return data;
}


export async function getAvatarUrl(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_url, avatar_initials')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}


export async function getProfilesByIds(userIds) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_initials, avatar_url')
    .in('id', userIds);
  if (error) throw error;
  return data;
}


export async function searchProfiles(query) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_initials, avatar_url')
    .ilike('username', `%${query}%`)  // case insensitive search
    .limit(10);
  if (error) throw error;
  return data;
}


// UPDATE full profile
export async function updateProfile(userId, updates) {
  // updates can include: username, full_name, avatar_url, website, avatar_initials
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// UPDATE username only
export async function setUsername(userId, username) {
  if (username.length < 3) throw new Error('Username must be at least 3 characters.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// UPDATE avatar URL
export async function setAvatarUrl(userId, avatarUrl) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      avatar_url:  avatarUrl,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// UPDATE avatar initials
export async function setAvatarInitials(userId, initials) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      avatar_initials: initials.toUpperCase().slice(0, 2),
      updated_at:      new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// UPSERT profile (create if not exists, update if exists)
export async function upsertProfile(userId, email) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id:              userId,
      username:        email.split('@')[0],
      full_name:       '',
      avatar_initials: email.slice(0, 2).toUpperCase(),
      updated_at:      new Date().toISOString(),
    }, {
      onConflict: 'id',    // if id exists, update instead of insert
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}