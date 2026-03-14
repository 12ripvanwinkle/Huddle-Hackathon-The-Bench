<<<<<<< HEAD
function haversineDistance(coords1, coords2) {
    let lat_d = (coords2.latitude - coords1.latitude) * Math.PI/180;
    let lon_d = (coords2.longitude - coords1.longitude) * Math.PI/180;
    lat = (lat_d) * Math.PI/180;
    lon = (lon_d) * Math.PI/180;
    
    let a = Math.pow(Math.sin(lat_d/2), 2)+
            Math.pow(Math.sin(lon_d/2))*
            Math.cos(lat)*Math.cos(lon)
        r = 6371
        d = 2*r*Math.asin(Math.sqrt(a))
    return d
}
=======
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
>>>>>>> 337a461014d2bd0b85e3673444d0cb383badc532
