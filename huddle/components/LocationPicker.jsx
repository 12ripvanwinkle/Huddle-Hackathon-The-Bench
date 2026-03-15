import { useEffect, useRef, useState } from 'react';

const ORANGE = '#fb7854';

export default function LocationPicker({ 
  userLocation, 
  onLocationSelect, 
  apiKey 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [mode, setMode] = useState('current'); // 'current' | 'address' | 'drag'
  const [address, setAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(userLocation);
  const [radius, setRadius] = useState(150);
  const [searching, setSearching] = useState(false);

  const RADIUS_OPTIONS = [0, 50, 100, 150, 300, 500];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const loc = userLocation || { latitude: 18.0228, longitude: -76.7738 };
      
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: loc.latitude, lng: loc.longitude },
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      // Draggable marker
      const marker = new window.google.maps.Marker({
        position: { lat: loc.latitude, lng: loc.longitude },
        map,
        draggable: true,
        title: 'Drag to set location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: ORANGE,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });

      markerRef.current = marker;

      // Radius circle
      const circle = new window.google.maps.Circle({
        map,
        center: { lat: loc.latitude, lng: loc.longitude },
        radius: radius,
        fillColor: ORANGE,
        fillOpacity: 0.12,
        strokeColor: ORANGE,
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });

      circleRef.current = circle;

      // Update location when marker is dragged
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const newLoc = { latitude: pos.lat(), longitude: pos.lng() };
        setSelectedLocation(newLoc);
        circle.setCenter(pos);
        onLocationSelect(newLoc, radius);
      });

      // Click on map to move marker (drag mode)
      map.addListener('click', (e) => {
        if (mode !== 'drag') return;
        const newPos = e.latLng;
        marker.setPosition(newPos);
        circle.setCenter(newPos);
        const newLoc = { latitude: newPos.lat(), longitude: newPos.lng() };
        setSelectedLocation(newLoc);
        onLocationSelect(newLoc, radius);
      });

      onLocationSelect(loc, 150);
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
  }, []);

  // Update circle radius when radius changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
      if (selectedLocation) {
        onLocationSelect(selectedLocation, radius);
      }
    }
  }, [radius]);

  // Use current location
  const useCurrentLocation = () => {
    setMode('current');
    if (!userLocation) return;
    const pos = { lat: userLocation.latitude, lng: userLocation.longitude };
    if (markerRef.current) markerRef.current.setPosition(pos);
    if (circleRef.current) circleRef.current.setCenter(pos);
    if (mapInstanceRef.current) mapInstanceRef.current.setCenter(pos);
    setSelectedLocation(userLocation);
    onLocationSelect(userLocation, radius);
  };

  // Search address using Google Places
  const searchAddress = async () => {
    if (!address.trim() || !window.google) return;
    setSearching(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        setSearching(false);
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          const newLoc = { latitude: loc.lat(), longitude: loc.lng() };
          const pos = { lat: loc.lat(), lng: loc.lng() };
          if (markerRef.current) markerRef.current.setPosition(pos);
          if (circleRef.current) circleRef.current.setCenter(pos);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(pos);
            mapInstanceRef.current.setZoom(17);
          }
          setSelectedLocation(newLoc);
          onLocationSelect(newLoc, radius);
        } else {
          alert('Address not found. Try a different search.');
        }
      });
    } catch (e) {
      setSearching(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { key: 'current', label: '📍 Current' },
          { key: 'address', label: '🔍 Address' },
          { key: 'drag',    label: '📌 Pin' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => {
              setMode(opt.key);
              if (opt.key === 'current') useCurrentLocation();
            }}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 10,
              border: `1.5px solid ${mode === opt.key ? ORANGE : '#E0E0E0'}`,
              backgroundColor: mode === opt.key ? '#EEEDFE' : 'white',
              color: mode === opt.key ? ORANGE : '#666',
              fontWeight: mode === opt.key ? 600 : 400,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Address search */}
      {mode === 'address' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Enter address or place..."
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAddress()}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              border: '1px solid #DDD', fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={searchAddress}
            disabled={searching}
            style={{
              padding: '10px 16px', borderRadius: 10,
              backgroundColor: ORANGE, color: 'white',
              border: 'none', cursor: 'pointer', fontSize: 14,
              opacity: searching ? 0.6 : 1,
            }}
          >
            {searching ? '...' : 'Go'}
          </button>
        </div>
      )}

      {/* Drag mode hint */}
      {mode === 'drag' && (
        <div style={{
          backgroundColor: '#EEEDFE', borderRadius: 8, padding: '8px 12px',
          marginBottom: 12, fontSize: 12, color: ORANGE, textAlign: 'center',
        }}>
          Tap anywhere on the map to place the pin
        </div>
      )}

      {/* Map */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
      />

      {/* Radius selector */}
      <p style={{ fontSize: 13, color: '#666', marginBottom: 8, margin: '0 0 8px 0' }}>
        Huddle radius: <strong style={{ color: ORANGE }}>{radius}m</strong>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {RADIUS_OPTIONS.map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 13,
              border: `1px solid ${radius === r ? ORANGE : '#DDD'}`,
              backgroundColor: radius === r ? ORANGE : '#F9F9F9',
              color: radius === r ? 'white' : '#444',
              cursor: 'pointer',
              fontWeight: radius === r ? 600 : 400,
            }}
          >
            {r}m
          </button>
        ))}
      </div>

      {/* Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: '#999' }}>0m</span>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={radius}
          onChange={e => setRadius(Number(e.target.value))}
          style={{ flex: 1, accentColor: ORANGE }}
        />
        <span style={{ fontSize: 11, color: '#999' }}>500m</span>
      </div>
    </div>
  );
}