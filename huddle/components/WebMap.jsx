import { useEffect, useRef } from 'react';

const PURPLE = '#534AB7';
const RED = '#E24B4A';

export default function WebMap({ 
  userLocation, members, radius, huddleActive, userId,
  previewMode, previewRadius, previewCenter
}) {
  const mapRef            = useRef(null);
  const mapInstanceRef    = useRef(null);
  const circleRef         = useRef(null);
  const markersRef        = useRef([]);
  const previewCircleRef  = useRef(null);
  const youMarkerRef      = useRef(null);

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  // ── Initialize map ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: 18,
        disableDefaultUI: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // You marker
      youMarkerRef.current = new window.google.maps.Marker({
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
      const existing = document.getElementById('gmaps-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'gmaps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', initMap);
      }
    } else {
      initMap();
    }

    return () => { mapInstanceRef.current = null; };
  }, []);

  // ── Re-center when location loads ───────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !window.google) return;
    const pos = { lat: userLocation.latitude, lng: userLocation.longitude };
    mapInstanceRef.current.setCenter(pos);
    mapInstanceRef.current.setZoom(18);
    if (youMarkerRef.current) {
      youMarkerRef.current.setPosition(pos);
    }
  }, [userLocation]);

  // ── Preview circle (shows when create modal is open) ────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Remove old preview circle
    if (previewCircleRef.current) {
      previewCircleRef.current.setMap(null);
      previewCircleRef.current = null;
    }

    if (!previewMode || !previewCenter) return;

    // Draw preview circle
    previewCircleRef.current = new window.google.maps.Circle({
      map,
      center: { lat: previewCenter.latitude, lng: previewCenter.longitude },
      radius: previewRadius || 150,
      fillColor: PURPLE,
      fillOpacity: 0.15,
      strokeColor: PURPLE,
      strokeOpacity: 0.9,
      strokeWeight: 2,
    });

    // Center map on preview location
    map.setCenter({ 
      lat: previewCenter.latitude, 
      lng: previewCenter.longitude 
    });
    map.setZoom(17);

  }, [previewMode, previewRadius, previewCenter]);

  // ── Active session circle and member markers ─────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    // Remove old
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    if (!huddleActive || !userLocation) return;

    // Active radius circle
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

    // Member markers
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

        marker.addListener('click', () => infoWindow.open(map, marker));
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