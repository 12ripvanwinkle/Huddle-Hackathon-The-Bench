import * as Location from 'expo-location';
import { supabase } from './supabase';

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocation = async () => {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return location.coords;
};

export const watchAndBroadcastLocation = async (sessionId, userId, radius, centerLat, centerLng) => {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    async (location) => {
      const { latitude, longitude } = location.coords;
      const dist = getDistanceMeters(centerLat, centerLng, latitude, longitude);
      const status = dist > radius ? 'alert' : 'safe';
      await supabase
        .from('session_members')
        .update({ latitude, longitude, status, last_updated: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
    }
  );
  return subscription;
};

export const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
};

export const isOutsideRadius = (centerLat, centerLng, memberLat, memberLng, radius) => {
  return getDistanceMeters(centerLat, centerLng, memberLat, memberLng) > radius;
};


export async function requestLocationPermission() {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') return false;

  return true;
}


export async function getCurrentLocation() {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude:  location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

// ─────────────────────────────────────────
// DISTANCE HELPER
// ─────────────────────────────────────────

export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────
// GETTERS — READ FROM SUPABASE
// ─────────────────────────────────────────

// Get single member's location + status
export async function getMemberLocation(sessionId, userId) {
  const { data, error } = await supabase
    .from('session_members')
    .select('latitude, longitude, status, last_updated')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Get all member locations in a session
export async function getAllMemberLocations(sessionId) {
  const { data, error } = await supabase
    .from('session_members')
    .select(`
      user_id,
      latitude,
      longitude,
      status,
      last_updated,
      profiles (
        username,
        avatar_initials,
        avatar_url
      )
    `)
    .eq('session_id', sessionId)
    .neq('status', 'left');
  if (error) throw error;
  return data;
}

// Get session radius and center (host location)
export async function getSessionDetails(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      name,
      radius,
      active,
      host_id,
      expires_at,
      profiles (
        username,
        avatar_initials
      )
    `)
    .eq('id', sessionId)
    .single();
  if (error) throw error;
  return data;
}

// Get members who are outside the zone
export async function getAlertMembers(sessionId) {
  const { data, error } = await supabase
    .from('session_members')
    .select(`
      user_id,
      latitude,
      longitude,
      last_updated,
      profiles (
        username,
        avatar_initials
      )
    `)
    .eq('session_id', sessionId)
    .eq('status', 'alert');
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────
// writers
// ─────────────────────────────────────────

// Update own location + recalculate status
export async function pushMemberLocation(sessionId, userId, latitude, longitude, centerLat, centerLng, radius) {
  const distance = getDistanceMeters(centerLat, centerLng, latitude, longitude);
  const status   = distance <= radius ? 'safe' : 'alert';

  const { data, error } = await supabase
    .from('session_members')
    .update({
      latitude,
      longitude,
      status,
      last_updated: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;}