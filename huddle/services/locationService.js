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
