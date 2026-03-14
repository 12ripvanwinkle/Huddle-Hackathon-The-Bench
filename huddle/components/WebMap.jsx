import { useEffect, useRef } from 'react';

const PURPLE = '#534AB7';
const RED = '#E24B4A';

export default function WebMap({ userLocation, members, radius, huddleActive, userId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);
  const markersRef = useRef([]);

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: 16,
        disableDefaultUI: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // You marker
      new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: 'You',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: PURPLE,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      mapInstanceRef.current = null;
    };
  }, []);

  // Update circle and markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Remove old circle
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    // Remove old member markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (!huddleActive) return;

    // Draw radius circle
    circleRef.current = new window.google.maps.Circle({
      map,
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
      radius,
      fillColor: PURPLE,
      fillOpacity: 0.12,
      strokeColor: PURPLE,
      strokeOpacity: 0.6,
      strokeWeight: 2,
    });

    // Draw member markers
    members
      .filter(m => m.latitude && m.longitude && m.user_id !== userId)
      .forEach(m => {
        const outside = m.status === 'alert';
        const color = outside ? RED : PURPLE;
        const name = m.profiles?.username || m.username || 'Member';

        const marker = new window.google.maps.Marker({
          position: { lat: m.latitude, lng: m.longitude },
          map,
          title: name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<b>${name}</b><br>${outside ? '⚠️ Outside zone' : '✅ In zone'}`,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });
  }, [members, radius, huddleActive]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', minHeight: 500 }}
    />
  );
}