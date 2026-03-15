import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Share, ScrollView, Platform
} from 'react-native';
import { supabase } from '../services/supabase';
import {
  watchAndBroadcastLocation,
  getCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';
import {
  createSession,
  joinSession,
  leaveSession,
  endSession,
  subscribeToSession,
  getSessionMembers,
  formatDistance
} from '../services/huddleService';
import RadiusSlider from '../components/RadiusSlider';

// Only load react-native-maps on mobile
let MapView, Circle, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Circle = Maps.Circle;
  Marker = Maps.Marker;
}

const WebMap = Platform.OS === 'web'
  ? require('../components/WebMap').default
  : null;

const PURPLE = '#534AB7';
const RED = '#E24B4A';
const BLUE_INFO = '#1A73E8';
const BANNER_ALERT = 'alert';
const BANNER_INFO = 'info';

export default function MapScreen({ session }) {
  const [userLocation, setUserLocation]             = useState(null);
  const [huddleActive, setHuddleActive]             = useState(false);
  const [isHost, setIsHost]                         = useState(false);
  const [radius, setRadius]                         = useState(150);
  const [currentSession, setCurrentSession]         = useState(null);
  const [sessionName, setSessionName]               = useState('');
  const [members, setMembers]                       = useState([]);
  const [showCreateModal, setShowCreateModal]       = useState(false);
  const [showJoinModal, setShowJoinModal]           = useState(false);
  const [showSessionModal, setShowSessionModal]     = useState(false);
  const [showInviteModal, setShowInviteModal]       = useState(false);
  const [joinCodeInput, setJoinCodeInput]           = useState('');
  const [selectedFriends, setSelectedFriends]       = useState([]);
  const [inviteSearch, setInviteSearch]             = useState('');
  const [banner, setBanner]                         = useState(null);

  // Preview state
  const [previewRadius, setPreviewRadius]           = useState(150);
  const [previewCenter, setPreviewCenter]           = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressInput, setAddressInput]             = useState('');

  const bannerOpacity        = useRef(new Animated.Value(0)).current;
  const locationSubscription = useRef(null);
  const realtimeSubscription = useRef(null);
  const prevAlertCount       = useRef(0);
  const mapRef               = useRef(null);

  const userId = session?.user?.id;

  const FRIENDS_LIST = [
    { id: 'f1', name: 'Jordan Kim',   initials: 'JK', phone: '+1 555 0101' },
    { id: 'f2', name: 'Alex Morales', initials: 'AM', phone: '+1 555 0102' },
    { id: 'f3', name: 'Taylor Wong',  initials: 'TW', phone: '+1 555 0103' },
    { id: 'f4', name: 'Sam Rivera',   initials: 'SR', phone: '+1 555 0104' },
  ];

  // ── Location setup ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Location access is required for Huddle.');
        return;
      }
      const coords = await getCurrentLocation();
      setUserLocation(coords);
      setPreviewCenter(coords); // set preview center to current location by default
    })();

    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
      if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
    };
  }, []);

  // ── Start broadcasting location ──────────────────────────
  useEffect(() => {
    if (!huddleActive || !currentSession || !userLocation) return;
    const startTracking = async () => {
      if (locationSubscription.current) locationSubscription.current.remove();
      const sub = await watchAndBroadcastLocation(
        currentSession.id, userId, currentSession.radius,
        userLocation.latitude, userLocation.longitude
      );
      locationSubscription.current = sub;
    };
    startTracking();
  }, [huddleActive, currentSession]);

  // ── Realtime member updates ──────────────────────────────
  useEffect(() => {
    if (!huddleActive || !currentSession) return;
    loadMembers();
    const sub = subscribeToSession(currentSession.id, (updatedMember) => {
      setMembers(prev => {
        const exists = prev.find(m => m.user_id === updatedMember.user_id);
        if (exists) {
          return prev.map(m =>
            m.user_id === updatedMember.user_id
              ? { ...m, ...updatedMember, username: m.username, avatar_initials: m.avatar_initials }
              : m
          );
        }
        return [...prev, updatedMember];
      });
    });
    realtimeSubscription.current = sub;
    return () => sub.unsubscribe();
  }, [huddleActive, currentSession]);
  
  // ── DEEP LINK HANDLER ──
  
  useEffect(() => {
  const handleUrl = (url) => {
    if (!url || !url.includes('/join/')) return; // ← guard clause
    const code = url.split('/join/').pop();
    if (!code || code.length < 4) return;        // ← validate code exists
    setJoinCodeInput(code);
    setShowJoinModal(true);
  };

  const getInitialLink = async () => {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) handleUrl(initialUrl); // handleUrl now guards internally
  };
  getInitialLink();

  const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
  return () => subscription.remove();
}, []);
  const loadMembers = async () => {
    if (!currentSession) return;
    try {
      const data = await getSessionMembers(currentSession.id);
      const enriched = data.map(m => ({
        ...m,
        username: m.profiles?.username || 'Member',
        avatar_initials: m.profiles?.avatar_initials || '??',
      }));
      setMembers(enriched);
    } catch (e) {
      console.log('Error loading members:', e.message);
    }
  };

  // ── Banner ───────────────────────────────────────────────
  const showBanner = (message, type) => {
    setBanner({ message, type });
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setBanner(null));
  };

  // ── Alert detection ──────────────────────────────────────
  useEffect(() => {
    if (!huddleActive || !userLocation) return;
    const alertMembers = members.filter(m => m.status === 'alert' && m.user_id !== userId);
    if (alertMembers.length > prevAlertCount.current) {
      const names = alertMembers.map(m => m.profiles?.username || 'Someone').join(', ');
      showBanner(`⚠️ ${names} left the huddle zone`, BANNER_ALERT);
    }
    prevAlertCount.current = alertMembers.length;
  }, [members]);

  // ── Session actions ──────────────────────────────────────
  const handleCreateHuddle = async () => {
    if (!sessionName.trim()) {
      Alert.alert('Name required', 'Please enter a session name.');
      return;
    }
    const center = previewCenter || userLocation;
    if (!center) {
      Alert.alert('Location needed', 'Please wait for your location to load.');
      return;
    }
    try {
      const newSession = await createSession(sessionName, userId, previewRadius);
      setCurrentSession({
        ...newSession,
        centerLat: center.latitude,
        centerLng: center.longitude,
      });
      setRadius(previewRadius);
      setHuddleActive(true);
      setIsHost(true);
      setShowCreateModal(false);
      setPreviewCenter(null);
      setShowLocationPicker(false);
      setAddressInput('');
      Alert.alert('Huddle Created! 🎉', `Share this code:\n\n${newSession.id}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleJoinHuddle = async () => {
    if (joinCodeInput.length < 4) {
      Alert.alert('Invalid code', 'Enter the code from your friend.');
      return;
    }
    try {
      const joined = await joinSession(joinCodeInput, userId);
      setCurrentSession(joined);
      setRadius(joined.radius);
      setSessionName(joined.name);
      setHuddleActive(true);
      setIsHost(false);
      setShowJoinModal(false);
      Alert.alert('Joined! 🙌', `You joined ${joined.name}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleLeaveSession = () => {
    Alert.alert('Leave Session', "You'll be removed from the huddle.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await leaveSession(currentSession.id, userId);
            if (locationSubscription.current) locationSubscription.current.remove();
            if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
            setShowSessionModal(false);
            setHuddleActive(false);
            setIsHost(false);
            setCurrentSession(null);
            setSessionName('');
            setMembers([]);
            prevAlertCount.current = 0;
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleEndHuddle = () => {
    Alert.alert('End Huddle', 'This will end the session for all members.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End for Everyone', style: 'destructive',
        onPress: async () => {
          try {
            await endSession(currentSession.id);
            if (locationSubscription.current) locationSubscription.current.remove();
            if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
            setShowSessionModal(false);
            setHuddleActive(false);
            setIsHost(false);
            setCurrentSession(null);
            setSessionName('');
            setMembers([]);
            prevAlertCount.current = 0;
          } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  // ── Invite ───────────────────────────────────────────────
  const shareCode = async () => {
    try {
      await Share.share({
        message: `Join my Huddle session "${sessionName}"!\n\nCode: ${currentSession?.id}\n\nDownload Huddle to stay safe 🤝`,
      });
    } catch (e) { Alert.alert('Could not share', e.message); }
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Join my Huddle!\n\nhttps://huddle.app/join/${currentSession?.id}\n\nOr enter code: ${currentSession?.id}`,
      });
    } catch (e) { Alert.alert('Could not share', e.message); }
  };

  const toggleFriendSelect = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const sendFriendInvites = () => {
    if (selectedFriends.length === 0) {
      Alert.alert('No friends selected', 'Tap friends to select them first.');
      return;
    }
    const names = FRIENDS_LIST.filter(f => selectedFriends.includes(f.id)).map(f => f.name).join(', ');
    Alert.alert('Invites Sent! 📨', `Invited: ${names}\n\nCode: ${currentSession?.id}`);
    setSelectedFriends([]);
    setShowInviteModal(false);
  };

  const filteredFriends = FRIENDS_LIST.filter(f =>
    f.name.toLowerCase().includes(inviteSearch.toLowerCase())
  );

  const activeMembers = members.filter(m => m.status !== 'left');
  const alertMembers  = members.filter(m => m.status === 'alert');

  // preview center to use
  const activePrevCenter = previewCenter || userLocation;

  return (
    <View style={styles.container}>

      {/* ── MAP ── */}
      {userLocation ? (
        Platform.OS === 'web' ? (
          <div style={{ flex: 1, width: '100%', height: '100%' }}>
            <WebMap
              userLocation={userLocation}
              members={members}
              radius={radius}
              huddleActive={huddleActive}
              userId={userId}
              previewMode={showCreateModal}
              previewRadius={previewRadius}
              previewCenter={activePrevCenter}
            />
          </div>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Active session circle */}
            {huddleActive && (
              <Circle
                center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                radius={radius}
                fillColor="rgba(83,74,183,0.12)"
                strokeColor="rgba(83,74,183,0.6)"
                strokeWidth={2}
              />
            )}

            {/* ✨ PREVIEW CIRCLE — shows when create modal is open */}
            {showCreateModal && activePrevCenter && (
              <Circle
                center={{
                  latitude: activePrevCenter.latitude,
                  longitude: activePrevCenter.longitude,
                }}
                radius={previewRadius}
                fillColor="rgba(83,74,183,0.15)"
                strokeColor="#534AB7"
                strokeWidth={2}
              />
            )}

            {/* Member markers */}
            {huddleActive && members
              .filter(m => m.latitude && m.longitude && m.user_id !== userId)
              .map(m => (
                <Marker
                  key={m.user_id}
                  coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                  title={m.profiles?.username || m.username || 'Member'}
                  description={m.status === 'alert' ? '⚠️ Outside zone' : '✅ In zone'}
                  pinColor={m.status === 'alert' ? '#E24B4A' : '#534AB7'}
                />
              ))
            }
          </MapView>
        )
      ) : (
        <View style={styles.loadingMap}>
          <Text style={styles.loadingText}>📍 Getting your location...</Text>
        </View>
      )}

      {/* Banner */}
      {banner && (
        <Animated.View style={[
          styles.banner,
          banner.type === BANNER_ALERT ? styles.bannerAlert : styles.bannerInfo,
          { opacity: bannerOpacity }
        ]}>
          <Text style={[
            styles.bannerText,
            banner.type === BANNER_ALERT ? styles.bannerTextAlert : styles.bannerTextInfo
          ]}>
            {banner.message}
          </Text>
        </Animated.View>
      )}

      {/* Top bar */}
      {huddleActive && (
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarTitle}>{sessionName || currentSession?.name || 'Huddle Session'}</Text>
            <Text style={styles.hostBadge}>{isHost ? '👑 Host' : '👤 Member'}</Text>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.inviteChip}>
              <Text style={styles.inviteChipText}>📋 {currentSession?.id}</Text>
            </View>
            <TouchableOpacity style={styles.gearBtn} onPress={() => setShowSessionModal(true)}>
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom panel */}
      {huddleActive && (
        <View style={styles.bottomPanel}>
          <RadiusSlider radius={radius} onChange={setRadius} disabled={!isHost} />
          <View style={styles.bottomRow}>
            <View style={styles.codeChip}>
              <Text style={styles.codeText}>Code: {currentSession?.id}</Text>
            </View>
            <View style={styles.membersChip}>
              <Text style={styles.membersText}>
                👥 {activeMembers.length} active
                {alertMembers.length > 0 && ` · ⚠️ ${alertMembers.length}`}
              </Text>
            </View>
          </View>
          {isHost && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInviteModal(true)}>
              <Text style={styles.inviteBtnText}>➕ Invite Members</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {!huddleActive && (
        <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.joinButtonText}>Join a Huddle</Text>
        </TouchableOpacity>
      )}

      {/* ══ SESSION OPTIONS MODAL ══ */}
      <Modal visible={showSessionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Session Options</Text>
            <Text style={styles.sessionInfo}>{currentSession?.name} · {activeMembers.length} members</Text>
            {isHost && (
              <TouchableOpacity style={styles.inviteOptionBtn} onPress={() => { setShowSessionModal(false); setShowInviteModal(true); }}>
                <Text style={styles.inviteOptionIcon}>➕</Text>
                <View style={styles.inviteOptionText}>
                  <Text style={styles.inviteOptionTitle}>Invite Members</Text>
                  <Text style={styles.inviteOptionSub}>Share code, link or select friends</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveSession}>
              <Text style={styles.leaveBtnText}>🚶 Leave Session</Text>
              <Text style={styles.leaveBtnSub}>Others stay. They'll see a quiet notice.</Text>
            </TouchableOpacity>
            {isHost && (
              <TouchableOpacity style={styles.endBtn} onPress={handleEndHuddle}>
                <Text style={styles.endBtnText}>🛑 End Huddle for Everyone</Text>
                <Text style={styles.endBtnSub}>Dissolves the session for all members.</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSessionModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ INVITE MODAL ══ */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Invite Members</Text>
            <Text style={styles.sessionInfo}>Code: {currentSession?.id}</Text>
            <TouchableOpacity style={styles.inviteOptionBtn} onPress={shareCode}>
              <Text style={styles.inviteOptionIcon}>📤</Text>
              <View style={styles.inviteOptionText}>
                <Text style={styles.inviteOptionTitle}>Share Code</Text>
                <Text style={styles.inviteOptionSub}>Send via WhatsApp, SMS, or any app</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inviteOptionBtn} onPress={shareLink}>
              <Text style={styles.inviteOptionIcon}>🔗</Text>
              <View style={styles.inviteOptionText}>
                <Text style={styles.inviteOptionTitle}>Share Link</Text>
                <Text style={styles.inviteOptionSub}>Send a tap-to-join link</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.friendsHeader}>Select Friends {selectedFriends.length > 0 && `(${selectedFriends.length})`}</Text>
            <TextInput style={styles.input} placeholder="Search friends..." value={inviteSearch} onChangeText={setInviteSearch} />
            <ScrollView style={{ maxHeight: 200 }}>
              {filteredFriends.map(friend => {
                const selected = selectedFriends.includes(friend.id);
                return (
                  <TouchableOpacity key={friend.id} style={[styles.friendRow, selected && styles.friendRowSelected]} onPress={() => toggleFriendSelect(friend.id)}>
                    <View style={[styles.friendAvatar, { backgroundColor: selected ? PURPLE : '#E0E0E0' }]}>
                      <Text style={[styles.friendAvatarText, { color: selected ? 'white' : '#666' }]}>{friend.initials}</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendPhone}>{friend.phone}</Text>
                    </View>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedFriends.length > 0 && (
              <TouchableOpacity style={styles.primaryBtn} onPress={sendFriendInvites}>
                <Text style={styles.primaryBtnText}>Send Invites ({selectedFriends.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowInviteModal(false); setSelectedFriends([]); setInviteSearch(''); }}>
              <Text style={styles.cancelBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ CREATE MODAL ══ */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Create Huddle Session</Text>

              <Text style={styles.modalLabel}>Session name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Coachella Squad"
                value={sessionName}
                onChangeText={setSessionName}
              />

              {/* Location picker */}
              <Text style={styles.modalLabel}>Huddle center</Text>
              <View style={styles.locationOptions}>
                <TouchableOpacity
                  style={[styles.locationOption, !showLocationPicker && styles.locationOptionActive]}
                  onPress={() => {
                    setShowLocationPicker(false);
                    setPreviewCenter(userLocation);
                  }}
                >
                  <Text style={[styles.locationOptionText, !showLocationPicker && styles.locationOptionTextActive]}>
                    📍 Current
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationOption, showLocationPicker === 'address' && styles.locationOptionActive]}
                  onPress={() => setShowLocationPicker('address')}
                >
                  <Text style={[styles.locationOptionText, showLocationPicker === 'address' && styles.locationOptionTextActive]}>
                    🔍 Address
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationOption, showLocationPicker === 'drag' && styles.locationOptionActive]}
                  onPress={() => setShowLocationPicker('drag')}
                >
                  <Text style={[styles.locationOptionText, showLocationPicker === 'drag' && styles.locationOptionTextActive]}>
                    📌 Pin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Address search */}
              {showLocationPicker === 'address' && (
                <View style={styles.addressRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                    placeholder="Enter address or place..."
                    value={addressInput}
                    onChangeText={setAddressInput}
                  />
                  <TouchableOpacity
                    style={styles.goBtn}
                    onPress={async () => {
                      if (!addressInput.trim()) return;
                      try {
                        // Use Google Geocoding REST API (works on mobile too)
                        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
                        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressInput)}&key=${apiKey}`;
                        const res = await fetch(url);
                        const data = await res.json();
                        if (data.status === 'OK' && data.results[0]) {
                          const loc = data.results[0].geometry.location;
                          setPreviewCenter({ latitude: loc.lat, longitude: loc.lng });
                          // Pan map to new location
                          if (mapRef.current) {
                            mapRef.current.animateToRegion({
                              latitude: loc.lat,
                              longitude: loc.lng,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            }, 500);
                          }
                        } else {
                          Alert.alert('Not found', 'Address not found. Try a different search.');
                        }
                      } catch (e) {
                        Alert.alert('Error', 'Could not search address.');
                      }
                    }}
                  >
                    <Text style={styles.goBtnText}>Go</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Drag hint */}
              {showLocationPicker === 'drag' && (
                <View style={styles.dragHint}>
                  <Text style={styles.dragHintText}>
                    📌 Close this modal, tap anywhere on the map to place your pin, then tap + again
                  </Text>
                </View>
              )}

              {/* Preview info */}
              <View style={styles.previewInfo}>
                <Text style={styles.previewInfoText}>
                  👁 Radius circle previewing on map · {previewRadius}m
                </Text>
              </View>

              {/* Radius */}
              <Text style={styles.modalLabel}>Radius: {previewRadius}m</Text>
              <RadiusSlider
                radius={previewRadius}
                onChange={(r) => {
                  setPreviewRadius(r);
                }}
                disabled={false}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateHuddle}>
                <Text style={styles.primaryBtnText}>Create & Get Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setPreviewCenter(null);
                  setShowLocationPicker(false);
                  setAddressInput('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ JOIN MODAL ══ */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join a Huddle</Text>
            <Text style={styles.modalLabel}>Enter invite code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HX4821"
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
              maxLength={8}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinHuddle}>
              <Text style={styles.primaryBtnText}>Join Huddle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  // ── Layout ───────────────────────────────────────────────
  container:   { flex: 1 },
  map:         { flex: 1 },
  loadingMap:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e8f0e8' },
  loadingText: { fontSize: 16, color: '#666' },

  // ── Alert banner ─────────────────────────────────────────
  banner: {
    position: 'absolute',
    top: 120, left: 16, right: 16,
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
  },
  bannerAlert:     { backgroundColor: '#FEECEC', borderColor: RED },
  bannerInfo:      { backgroundColor: '#E8F0FE', borderColor: BLUE_INFO },
  bannerText:      { fontSize: 13, textAlign: 'center', fontWeight: '500' },
  bannerTextAlert: { color: RED },
  bannerTextInfo:  { color: BLUE_INFO },

  // ── Top bar ──────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 60, left: 16, right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarTitle: { fontWeight: '600', fontSize: 15, color: '#222' },
  hostBadge:   { fontSize: 11, color: '#888', marginTop: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteChip:  {
    backgroundColor: '#EEEDFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inviteChipText: { color: PURPLE, fontSize: 13, fontWeight: '500' },
  gearBtn:  { padding: 4 },
  gearIcon: { fontSize: 20 },

  // ── Bottom panel ─────────────────────────────────────────
  bottomPanel: {
    position: 'absolute',
    bottom: 70, left: 0, right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  codeChip: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#AFA9EC',
  },
  codeText: { color: PURPLE, fontSize: 13, fontWeight: '500' },
  membersChip: {
    flex: 1,
    backgroundColor: '#F5F4FF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#AFA9EC',
  },
  membersText:   { color: PURPLE, fontSize: 13, fontWeight: '500' },
  inviteBtn:     { backgroundColor: PURPLE, borderRadius: 10, padding: 12, alignItems: 'center' },
  inviteBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  // ── FAB & Join button ────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 320, right: 20,
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: 'white', fontSize: 28, fontWeight: '300', marginTop: -2 },
  joinButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },

  // ── Invite modal — options ───────────────────────────────
  inviteOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  inviteOptionIcon:  { fontSize: 24, marginRight: 12 },
  inviteOptionText:  { flex: 1 },
  inviteOptionTitle: { fontSize: 15, fontWeight: '500', color: '#222' },
  inviteOptionSub:   { fontSize: 12, color: '#999', marginTop: 2 },

  // ── Friends list ─────────────────────────────────────────
  friendsHeader: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 4 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#EBEBEB',
  },
  friendRowSelected: { borderColor: PURPLE, backgroundColor: '#F5F4FF' },
  friendAvatar: {
    width: 38, height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  friendAvatarText: { fontWeight: '600', fontSize: 13 },
  friendInfo:   { flex: 1 },
  friendName:   { fontSize: 14, fontWeight: '500', color: '#222' },
  friendPhone:  { fontSize: 12, color: '#999' },
  checkmark:    { fontSize: 16, color: PURPLE, fontWeight: '700' },

  // ── Session options modal ────────────────────────────────
  leaveBtn: {
    borderWidth: 0.5,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  leaveBtnText: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 4 },
  leaveBtnSub:  { fontSize: 12, color: '#999' },
  endBtn: {
    borderWidth: 0.5,
    borderColor: RED,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFF8F8',
  },
  endBtnText: { fontSize: 15, fontWeight: '500', color: RED, marginBottom: 4 },
  endBtnSub:  { fontSize: 12, color: '#999' },

  // ── Shared modal base styles ─────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle:  { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 4 },
  sessionInfo: { fontSize: 13, color: '#999', marginBottom: 16 },
  modalLabel:  { fontSize: 13, color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 0.5,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    color: '#222',
  },
  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  primaryBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  cancelBtn:      { alignItems: 'center', padding: 10 },
  cancelBtnText:  { color: '#999', fontSize: 14 },

  // ── Create modal (transparent overlay, map shows behind) ─
  createModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  createModalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
    elevation: 20,
  },

  // ── Location picker ──────────────────────────────────────
  locationOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  locationOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  locationOptionActive:    { backgroundColor: '#EEEDFE', borderColor: PURPLE },
  locationOptionText:      { fontSize: 12, color: '#666' },
  locationOptionTextActive: { color: PURPLE, fontWeight: '600' },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  goBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  // ── Hints & preview ──────────────────────────────────────
  dragHint: {
    backgroundColor: '#EEEDFE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  dragHintText: { color: PURPLE, fontSize: 12, textAlign: 'center' },
  previewInfo: {
    backgroundColor: '#F5F4FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#AFA9EC',
  },
  previewInfoText: { color: PURPLE, fontSize: 12, textAlign: 'center' },

});