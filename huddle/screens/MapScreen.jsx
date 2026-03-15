import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Share, ScrollView, Platform, Image, Vibration
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import {
  getCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';
import {
  createSession,
  joinSession,
  leaveSession,
  endAndDeleteSession,
  updateSessionRadius,
  subscribeToSession,
  getSessionMembers,
  formatDistance,
  getDistanceMeters
} from '../services/huddleService';
import { MovementAnalyzer } from '../services/movementAnalyzer';
import { postSessionAlert, subscribeToSessionAlerts } from '../services/alertService';
import RadiusSlider from '../components/RadiusSlider';
import MemberAvatar from '../components/MemberAvatar';

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

const PURPLE = '#fb7854';
const RED = '#E24B4A';
const BLUE_INFO = '#1A73E8';
const BANNER_ALERT = 'alert';
const BANNER_INFO = 'info';
const USER_FOCUS_DELTA = 0.002;

const makeInitials = (value) => {
  if (!value) return 'ME';
  const cleaned = String(value).trim();
  if (!cleaned) return 'ME';
  const base = cleaned.includes('@') ? cleaned.split('@')[0] : cleaned;
  const parts = base
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean);
  const letters = parts.slice(0, 2).map(p => p[0]).join('');
  return (letters || base.slice(0, 2)).toUpperCase();
};

const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${displayHour}:${paddedMinutes} ${ampm}`;
};

const formatCountdown = (ms) => {
  if (ms <= 0) return 'Ended';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function MapScreen({ session }) {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation]             = useState(null);
  const [huddleActive, setHuddleActive]             = useState(false);
  const [isHost, setIsHost]                         = useState(false);
  const [radius, setRadius]                         = useState(150);
  const [durationMinutes, setDurationMinutes]       = useState(30);
  const [remainingMs, setRemainingMs]               = useState(null);
  const [showAlertsLog, setShowAlertsLog]           = useState(false);
  const [alertLog, setAlertLog]                     = useState([]);
  const [panicSending, setPanicSending]             = useState(false);
  const [showMembersModal, setShowMembersModal]     = useState(false);
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
  const [friends, setFriends]                       = useState([]);
  const [friendsLoading, setFriendsLoading]         = useState(false);
  const [banner, setBanner]                         = useState(null);
  const [menuHidden, setMenuHidden]                 = useState(false);

  // Preview state
  const [previewRadius, setPreviewRadius]           = useState(150);
  const [previewCenter, setPreviewCenter]           = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressInput, setAddressInput]             = useState('');

  const bannerOpacity        = useRef(new Animated.Value(0)).current;
  const uiLocationSubscription = useRef(null);
  const realtimeSubscription = useRef(null);
  const prevAlertCount       = useRef(0);
  const prevAlertedIdsRef    = useRef(new Set());
  const mapRef               = useRef(null);
  const movementAnalyzer     = useRef(null);
  const panicFlashOpacity    = useRef(new Animated.Value(0)).current;
  const panicFlashAnimRef    = useRef(null);
  const lastPanicKeyRef      = useRef(null);
  const lastLocalPanicSentAtRef = useRef(0);

  const userId = session?.user?.id;
  const [myInitials, setMyInitials] = useState('ME');
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const [myUsername, setMyUsername] = useState('Member');
  const [panicFlashWho, setPanicFlashWho] = useState(null);
  const didInitialFocusRef = useRef(false);
  const lastFocusedSessionRef = useRef(null);
  const broadcastContextRef = useRef(null);
  const broadcastInFlightRef = useRef(false);
  const lastBroadcastAtRef = useRef(0);
  const expirationHandledRef = useRef(false);
  const huddleActiveRef = useRef(false);
  const alertsChannelRef = useRef(null);
  const lastMyZoneStatusRef = useRef('safe');

  useEffect(() => {
    huddleActiveRef.current = huddleActive;
  }, [huddleActive]);

  // Load user marker identity (initials + optional avatar URL from auth metadata)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const meta = session?.user?.user_metadata || {};
      const metaAvatarUrl = meta.avatar_url || meta.picture || null;
      if (!cancelled) setMyAvatarUrl(metaAvatarUrl);

      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_initials, username')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setMyInitials(makeInitials(session?.user?.email));
        setMyUsername((session?.user?.email || 'Member').split('@')[0]);
        return;
      }

      if (data?.username) setMyUsername(data.username);
      setMyInitials(
        data?.avatar_initials ||
        makeInitials(data?.username || session?.user?.email)
      );
    };

    run();
    return () => { cancelled = true; };
  }, [userId]);

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

      // Keep the "you" marker moving as location updates
      if (uiLocationSubscription.current) uiLocationSubscription.current.remove();
      uiLocationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (location) => {
          const { latitude, longitude } = location.coords || {};
          if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
          setUserLocation({ latitude, longitude });

          const ctx = broadcastContextRef.current;
          if (!ctx) return;
          if (!huddleActiveRef.current) return;

          const now = Date.now();
          if (broadcastInFlightRef.current) return;
          if (now - lastBroadcastAtRef.current < 3000) return;

          lastBroadcastAtRef.current = now;
          broadcastInFlightRef.current = true;

          const status =
            getDistanceMeters(ctx.centerLat, ctx.centerLng, latitude, longitude) > ctx.radius
              ? 'alert'
              : 'safe';

          if (lastMyZoneStatusRef.current !== status) {
            const boundaryType = status === 'alert' ? 'boundary_exit' : 'boundary_return';
            const boundarySeverity = status === 'alert' ? 'danger' : 'info';
            const boundaryMessage = status === 'alert'
              ? 'left the huddle zone'
              : 'returned to the huddle zone';

            void postSessionAlert({
              sessionId: ctx.sessionId,
              userId: ctx.userId,
              username: myUsername,
              type: boundaryType,
              severity: boundarySeverity,
              message: boundaryMessage,
              emoji: status === 'alert' ? '⚠️' : '✅',
            }).catch((e) => {
              console.log('postSessionAlert (boundary) error:', e?.message ?? e);
            });

            lastMyZoneStatusRef.current = status;
          }

          const updatePromise = supabase
            .from('session_members')
            .upsert(
              {
                session_id: ctx.sessionId,
                user_id: ctx.userId,
                latitude,
                longitude,
                status,
                last_updated: new Date().toISOString(),
              },
              { onConflict: 'session_id,user_id' }
            );

          // Analyze movement and generate alerts (never block location writes)
          try {
            if (movementAnalyzer.current) {
              const movementData = movementAnalyzer.current.analyzeMovement(
                { latitude, longitude },
                members // Pass all members for proximity detection
              );

              // Process alerts
              if (movementData.alerts && movementData.alerts.length > 0) {
                movementData.alerts.forEach(async (alert) => {
                  // Share alerts with everyone in the huddle
                  void postSessionAlert({
                    sessionId: ctx.sessionId,
                    userId: ctx.userId,
                    username: myUsername,
                    type: alert.type,
                    severity: alert.severity,
                    message: alert.message,
                    emoji: alert.emoji,
                  }).catch((e) => {
                    console.log('postSessionAlert error:', e?.message ?? e);
                  });

                  // Generate AI-powered alert if available
                  try {
                    const aiAlert = await movementAnalyzer.current.generateAlert(
                      { name: myInitials, email: session?.user?.email },
                      { ...movementData, latitude, longitude },
                      alert.type
                    );
                    if (aiAlert) {
                      // Could send to group chat here
                      console.log('AI Alert:', aiAlert);
                    }
                  } catch (e) {
                    console.log('Alert generation error:', e.message);
                  }
                });
              }
            }
          } catch (e) {
            console.log('Movement analyzer error:', e?.message ?? e);
          }

          updatePromise
            .then(({ error }) => {
              if (error) console.log('Location update error:', error.message, error.code, error.details);
            })
            .finally(() => {
              broadcastInFlightRef.current = false;
            });
        }
      );
    })();

    return () => {
      if (uiLocationSubscription.current) uiLocationSubscription.current.remove();
      if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
    };
  }, []);

  // Focus map on the user by default (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!userLocation || !mapRef.current) return;
    if (didInitialFocusRef.current) return;

    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: USER_FOCUS_DELTA,
      longitudeDelta: USER_FOCUS_DELTA,
    }, 650);
    didInitialFocusRef.current = true;
  }, [userLocation]);

  // Re-focus when a huddle gets initialized (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!huddleActive || !currentSession?.id) return;
    if (!userLocation || !mapRef.current) return;
    if (lastFocusedSessionRef.current === currentSession.id) return;

    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: USER_FOCUS_DELTA,
      longitudeDelta: USER_FOCUS_DELTA,
    }, 650);
    lastFocusedSessionRef.current = currentSession.id;
  }, [huddleActive, currentSession?.id, userLocation]);

  // ── Start broadcasting location ──────────────────────────
  useEffect(() => {
    if (!huddleActive || !currentSession?.id || !userId) {
      broadcastContextRef.current = null;
      return;
    }

    const centerLat = currentSession.centerLat ?? userLocation?.latitude;
    const centerLng = currentSession.centerLng ?? userLocation?.longitude;
    const sessionRadius = currentSession.radius ?? radius;

    if (typeof centerLat !== 'number' || typeof centerLng !== 'number') {
      broadcastContextRef.current = null;
      return;
    }

    broadcastContextRef.current = {
      sessionId: currentSession.id,
      userId,
      radius: sessionRadius,
      centerLat,
      centerLng,
    };

    // Push once immediately so Supabase has a location even if the user stands still.
    if (typeof userLocation?.latitude === 'number' && typeof userLocation?.longitude === 'number') {
      const { latitude, longitude } = userLocation;
      const status =
        getDistanceMeters(centerLat, centerLng, latitude, longitude) > sessionRadius
          ? 'alert'
          : 'safe';

      lastBroadcastAtRef.current = 0;
      supabase
        .from('session_members')
        .upsert(
          {
            session_id: currentSession.id,
            user_id: userId,
            latitude,
            longitude,
            status,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'session_id,user_id' }
        )
        .then(({ error }) => {
          if (error) console.log('Initial location update error:', error.message, error.code, error.details);
        });
    }

    // Initialize or update movement analyzer for this session
    if (movementAnalyzer.current) {
      movementAnalyzer.current.updateSession(centerLat, centerLng, sessionRadius);
    } else {
      movementAnalyzer.current = new MovementAnalyzer(
        userId,
        currentSession.id,
        centerLat,
        centerLng,
        sessionRadius
      );
    }
  }, [
    huddleActive,
    currentSession?.id,
    currentSession?.radius,
    currentSession?.centerLat,
    currentSession?.centerLng,
    radius,
    userId,
    userLocation,
  ]);

  // ── Realtime member updates ──────────────────────────────
  useEffect(() => {
    if (!huddleActive || !currentSession) return;
    loadMembers();
    const sub = subscribeToSession(
      currentSession.id,
      // Member updates
      (updatedMember) => {
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
      },
      // Session updates (for radius changes / expiration)
      (updatedSession) => {
        if (updatedSession.active === false) {
          broadcastContextRef.current = null;
          broadcastInFlightRef.current = false;
          lastBroadcastAtRef.current = 0;
          movementAnalyzer.current = null;
          setShowSessionModal(false);
          setHuddleActive(false);
          setIsHost(false);
          setCurrentSession(null);
          setSessionName('');
          setRemainingMs(null);
          setMembers([]);
          prevAlertCount.current = 0;
          Alert.alert('Huddle ended', 'The host ended this huddle.');
          return;
        }
        if (updatedSession.radius !== radius) {
          setRadius(updatedSession.radius);
        }
        if (updatedSession.expires_at && updatedSession.expires_at !== currentSession.expires_at) {
          setCurrentSession(prev => ({ ...prev, expires_at: updatedSession.expires_at }));
        }
      }
    );
    realtimeSubscription.current = sub;
    return () => sub.unsubscribe();
  }, [huddleActive, currentSession]);

  // ── Alert detection (for alert log) ───────────────────────
  useEffect(() => {
    if (!huddleActive) return;

    const alertMembers = members.filter(m => m.status === 'alert' && m.user_id !== userId);
    const currentAlertedIds = new Set(alertMembers.map(m => m.user_id));
    const newlyAlerted = alertMembers.filter(m => !prevAlertedIdsRef.current.has(m.user_id));
    if (false) {
      const names = newlyAlerted.map(m => m.profiles?.username || m.username || 'Member').join(', ');
      const message = `⚠️ ${names} left the huddle zone`;

      showBanner(message, BANNER_ALERT);
      setAlertLog(prev => [{ time: new Date().toISOString(), message }, ...prev].slice(0, 50));
    }

    prevAlertedIdsRef.current = currentAlertedIds;
    prevAlertCount.current = alertMembers.length;
  }, [members, huddleActive, userId]);

  useEffect(() => {
    expirationHandledRef.current = false;
  }, [currentSession?.id]);

  useEffect(() => {
    // Reset alert UI between sessions
    setAlertLog([]);
    setShowAlertsLog(false);
    prevAlertedIdsRef.current = new Set();
    prevAlertCount.current = 0;
    lastMyZoneStatusRef.current = 'safe';
    setPanicFlashWho(null);
    lastPanicKeyRef.current = null;
    lastLocalPanicSentAtRef.current = 0;
    try {
      panicFlashOpacity.stopAnimation();
      panicFlashOpacity.setValue(0);
      if (panicFlashAnimRef.current?.stop) panicFlashAnimRef.current.stop();
      panicFlashAnimRef.current = null;
    } catch {}
  }, [currentSession?.id]);

  // ── Countdown timer ──────────────────────────────────────
  useEffect(() => {
    if (!huddleActive || !currentSession?.expires_at) {
      setRemainingMs(null);
      return;
    }

    const updateRemaining = () => {
      const expires = new Date(currentSession.expires_at).getTime();
      const diff = expires - Date.now();
      setRemainingMs(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [huddleActive, currentSession?.expires_at]);

  useEffect(() => {
    if (!huddleActive) return;
    if (!currentSession?.id) return;
    if (remainingMs === null || remainingMs > 0) return;
    if (expirationHandledRef.current) return;

    expirationHandledRef.current = true;

    (async () => {
      try {
        if (isHost) {
          await endAndDeleteSession(currentSession.id);
        }
      } catch (e) {
        console.log('Expiration cleanup error:', e?.message ?? e);
      } finally {
        broadcastContextRef.current = null;
        broadcastInFlightRef.current = false;
        lastBroadcastAtRef.current = 0;
        movementAnalyzer.current = null;
        setShowSessionModal(false);
        setHuddleActive(false);
        setIsHost(false);
        setCurrentSession(null);
        setSessionName('');
        setRemainingMs(null);
        setMembers([]);
        prevAlertCount.current = 0;
        Alert.alert('Huddle expired', 'This huddle has expired.');
      }
    })();
  }, [huddleActive, currentSession?.id, remainingMs, isHost]);
  
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
  const loadFriends = async () => {
    if (!userId) {
      setFriends([]);
      return;
    }

    setFriendsLoading(true);
    setFriends([]);
    try {
      const { data: friendRows, error } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted')
        .limit(200);

      if (error) throw error;

      const otherIds = Array.from(
        new Set(
          (friendRows || [])
            .map((r) => (r.user_id === userId ? r.friend_id : r.user_id))
            .filter(Boolean)
        )
      );

      if (otherIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_initials')
        .in('id', otherIds);

      if (profilesError) throw profilesError;

      const byId = new Map((profiles || []).map((p) => [p.id, p]));
      const normalized = otherIds.map((id) => {
        const p = byId.get(id);
        const name = p?.username || p?.full_name || 'Friend';
        const initials = p?.avatar_initials || makeInitials(name);
        return { id, name, initials, phone: '' };
      });

      setFriends(normalized);
    } catch (e) {
      console.log('Error loading friends:', e?.message ?? e);
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (!showInviteModal) return;
    void loadFriends();
  }, [showInviteModal, userId]);

  const showBanner = (message, type) => {
    setBanner({ message, type });
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setBanner(null));
  };

  const triggerPanicFlash = (who) => {
    setPanicFlashWho(who || 'Member');

    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 350, 120, 350, 120, 600], false);
      } catch {}
    }

    try {
      panicFlashOpacity.stopAnimation();
      panicFlashOpacity.setValue(0);
      if (panicFlashAnimRef.current?.stop) panicFlashAnimRef.current.stop();

      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(panicFlashOpacity, { toValue: 0.92, duration: 140, useNativeDriver: true }),
          Animated.timing(panicFlashOpacity, { toValue: 0.0, duration: 140, useNativeDriver: true }),
        ]),
        { iterations: 10 }
      );

      panicFlashAnimRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) setPanicFlashWho(null);
      });
    } catch (e) {
      console.log('Panic flash error:', e?.message ?? e);
      setPanicFlashWho(null);
    }
  };

  const handlePanic = () => {
    if (panicSending) return;
    if (!huddleActive || !currentSession?.id || !userId) {
      Alert.alert('Not in a huddle', 'Join or create a huddle first.');
      return;
    }

    Alert.alert(
      'Panic Button',
      "This will alert everyone in your current huddle.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          style: 'destructive',
           onPress: async () => {
             setPanicSending(true);
             lastLocalPanicSentAtRef.current = Date.now();
             triggerPanicFlash(myUsername || 'Member');
             try {
                await postSessionAlert({
                  sessionId: currentSession.id,
                  userId,
                username: myUsername || 'Member',
                type: 'panic',
                severity: 'danger',
                message: 'pressed the panic button. Please check in now.',
                emoji: '🚨',
              });
            } catch (e) {
              Alert.alert('Failed', e?.message ?? 'Could not send panic alert.');
            } finally {
              setPanicSending(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!huddleActive || !currentSession?.id) return;

    if (alertsChannelRef.current) {
      alertsChannelRef.current.unsubscribe();
      alertsChannelRef.current = null;
    }

    alertsChannelRef.current = subscribeToSessionAlerts(currentSession.id, (alertRow) => {
      console.log('session_alerts insert:', alertRow);
      const who = alertRow.username || 'Member';
      const text = `${alertRow.emoji || ''} ${who}: ${alertRow.message}`.trim();
      const type = alertRow.severity === 'danger' ? BANNER_ALERT : BANNER_INFO;

      if (alertRow.type === 'panic') {
        const key = alertRow.id ?? `${alertRow.user_id || ''}-${alertRow.created_at || ''}-${alertRow.message || ''}`;
        if (alertRow.user_id === userId && Date.now() - lastLocalPanicSentAtRef.current < 6000) {
          lastPanicKeyRef.current = key;
        } else if (lastPanicKeyRef.current !== key) {
          lastPanicKeyRef.current = key;
          triggerPanicFlash(who);
        }
      }

      showBanner(text, type);
      setAlertLog(prev => [{ time: alertRow.created_at || new Date().toISOString(), message: text }, ...prev].slice(0, 50));
    });

    // Initial read helps confirm RLS/table permissions even if Realtime isn't configured yet.
    (async () => {
      try {
        const { data, error } = await supabase
          .from('session_alerts')
          .select('id, username, message, emoji, severity, created_at')
          .eq('session_id', currentSession.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.log('session_alerts initial fetch error:', error.message, error.code, error.details);
          return;
        }

        if (Array.isArray(data) && data.length > 0) {
          setAlertLog(
            data.map((row) => {
              const who = row.username || 'Member';
              const text = `${row.emoji || ''} ${who}: ${row.message}`.trim();
              return { time: row.created_at || new Date().toISOString(), message: text };
            })
          );
        }
      } catch (e) {
        console.log('session_alerts initial fetch exception:', e?.message ?? e);
      }
    })();

    return () => {
      if (alertsChannelRef.current) {
        alertsChannelRef.current.unsubscribe();
        alertsChannelRef.current = null;
      }
    };
  }, [huddleActive, currentSession?.id]);

  // ── Handle radius changes (host only) ────────────────────
  const handleRadiusChange = async (newRadius) => {
    setRadius(newRadius);
    if (isHost && currentSession?.id) {
      try {
        await updateSessionRadius(currentSession.id, newRadius);
      } catch (e) {
        console.log('Failed to update session radius:', e.message);
        // Revert on error
        setRadius(radius);
      }
    }
  };

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

    const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();

    try {
      const newSession = await createSession(sessionName, userId, previewRadius, expiresAt);
      setCurrentSession({
        ...newSession,
        centerLat: center.latitude,
        centerLng: center.longitude,
        expires_at: expiresAt,
      });
      setRemainingMs(new Date(expiresAt).getTime() - Date.now());
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
      setRemainingMs(joined.expires_at ? new Date(joined.expires_at).getTime() - Date.now() : null);
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
            if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
            broadcastContextRef.current = null;
            broadcastInFlightRef.current = false;
            lastBroadcastAtRef.current = 0;
            movementAnalyzer.current = null;
            setShowSessionModal(false);
            setHuddleActive(false);
            setIsHost(false);
            setCurrentSession(null);
            setSessionName('');
            setRemainingMs(null);
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
            await endAndDeleteSession(currentSession.id);
            if (realtimeSubscription.current) realtimeSubscription.current.unsubscribe();
            broadcastContextRef.current = null;
            broadcastInFlightRef.current = false;
            lastBroadcastAtRef.current = 0;
            movementAnalyzer.current = null;
            setShowSessionModal(false);
            setHuddleActive(false);
            setIsHost(false);
            setCurrentSession(null);
            setSessionName('');
            setRemainingMs(null);
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
    const names = friends.filter(f => selectedFriends.includes(f.id)).map(f => f.name).join(', ');
    Alert.alert('Invites Sent! 📨', `Invited: ${names}\n\nCode: ${currentSession?.id}`);
    setSelectedFriends([]);
    setShowInviteModal(false);
  };

  const filteredFriends = friends.filter(f =>
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
              myInitials={myInitials}
              myAvatarUrl={myAvatarUrl}
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
              latitudeDelta: USER_FOCUS_DELTA,
              longitudeDelta: USER_FOCUS_DELTA,
            }}
            showsMyLocationButton
          >
            {/* You */}
            <Marker
              coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
              title="You"
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              {myAvatarUrl ? (
                <View style={styles.mePhotoWrap}>
                  <Image source={{ uri: myAvatarUrl }} style={styles.mePhoto} />
                </View>
              ) : (
                <MemberAvatar initials={myInitials} status="safe" size={46} />
              )}
            </Marker>
            {/* Active session circle */}
            {huddleActive && (
              <Circle
                center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                radius={radius}
                fillColor="rgba(251,120,84,0.12)"
                strokeColor="rgba(251,120,84,0.6)"
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
                fillColor="rgba(251,120,84,0.15)"
                strokeColor={PURPLE}
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
                  description={m.status === 'alert' ? 'Outside zone' : 'In zone'}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <MemberAvatar
                    initials={m.profiles?.avatar_initials || m.avatar_initials || '??'}
                    status={m.status}
                    size={40}
                  />
                </Marker>
              ))
            }
          </MapView>
        )
      ) : (
        <View style={styles.loadingMap}>
          <Text style={styles.loadingText}>📍 Getting your location...</Text>
        </View>
       )}

      {/* Panic flash overlay */}
      {panicFlashWho && (
        <Animated.View pointerEvents="none" style={[styles.panicFlashOverlay, { opacity: panicFlashOpacity }]}>
          <View style={[styles.panicFlashInner, { paddingTop: insets.top + 32 }]}>
            <Text style={styles.panicFlashTitle}>PANIC ALERT</Text>
            <Text style={styles.panicFlashWho}>{panicFlashWho}</Text>
          </View>
        </Animated.View>
      )}

      {/* Banner */}
      {banner && (
        <Animated.View style={[
          styles.banner,
          banner.type === BANNER_ALERT ? styles.bannerAlert : styles.bannerInfo,
          { top: insets.top + (huddleActive && !menuHidden ? 84 : 16) },
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
      {huddleActive && !menuHidden && (
        <View style={[styles.topBar, { top: insets.top + 12 }]}>
          <View>
            <Text style={styles.topBarTitle}>{sessionName || currentSession?.name || 'Huddle Session'}</Text>
            <Text style={styles.hostBadge}>{isHost ? '👑 Host' : '👤 Member'}</Text>
            {remainingMs != null && (
              <Text style={styles.sessionTimer}>Ends in {formatCountdown(remainingMs)}</Text>
            )}
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.hideMenuBtn} onPress={() => setMenuHidden(true)}>
              <Text style={styles.hideMenuText}>Hide</Text>
            </TouchableOpacity>
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
      {huddleActive && !menuHidden && (
        <View style={styles.bottomPanel}>
          <RadiusSlider radius={radius} onChange={handleRadiusChange} disabled={!isHost} />
          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.codeChip} onPress={() => setShowAlertsLog(true)}>
              <Text style={styles.codeText}>⚠️ {alertLog.length} alerts</Text>
              <Text style={styles.alertCountText}>Tap to view log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.membersChip} onPress={() => setShowMembersModal(true)}>
              <Text style={styles.membersText}>
                👥 {activeMembers.length} active
                {alertMembers.length > 0 && ` · ⚠️ ${alertMembers.length}`}
              </Text>
            </TouchableOpacity>
          </View>
          {isHost && (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInviteModal(true)}>
              <Text style={styles.inviteBtnText}>➕ Invite Members</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.panicBtn, panicSending && styles.panicBtnDisabled]}
            onPress={handlePanic}
            disabled={panicSending}
          >
            <Text style={styles.panicBtnText}>{panicSending ? 'Sending...' : '🚨 Panic'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {huddleActive && menuHidden && (
        <TouchableOpacity
          style={[styles.showMenuBtn, { top: insets.top + 12 }]}
          onPress={() => setMenuHidden(false)}
        >
          <Text style={styles.showMenuText}>Menu</Text>
        </TouchableOpacity>
      )}

      {huddleActive && menuHidden && (
        <TouchableOpacity
          style={[styles.panicFloatingBtn, { top: insets.top + 12 + 54 }]}
          onPress={handlePanic}
          disabled={panicSending}
        >
          <Text style={styles.panicFloatingText}>{panicSending ? '…' : '🚨'}</Text>
        </TouchableOpacity>
      )}

      {/* Alert log modal */}
      <Modal visible={showAlertsLog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>            
            <Text style={styles.modalTitle}>Alert Log</Text>
            <Text style={styles.sessionInfo}>{alertLog.length} alerts</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {alertLog.length === 0 ? (
                <Text style={styles.noAlertsText}>No alerts yet.</Text>
              ) : (
                alertLog.map((a, idx) => (
                  <View key={`${a.time}-${idx}`} style={styles.alertRow}>
                    <Text style={styles.alertTime}>{new Date(a.time).toLocaleTimeString()}</Text>
                    <Text style={styles.alertMessage}>{a.message}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAlertsLog(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Members modal */}
      <Modal visible={showMembersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Huddle Members</Text>
            <Text style={styles.sessionInfo}>{activeMembers.length} active members</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {activeMembers.length === 0 ? (
                <Text style={styles.noAlertsText}>No members yet.</Text>
              ) : (
                activeMembers.map((member) => (
                  <View key={member.user_id} style={styles.memberRow}>
                    <MemberAvatar
                      initials={member.profiles?.avatar_initials || member.avatar_initials || '??'}
                      status={member.status}
                      size={40}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.profiles?.username || member.username || 'Member'}
                        {member.user_id === userId && ' (You)'}
                      </Text>
                      <Text style={styles.memberStatus}>
                        {member.status === 'alert' ? '⚠️ Outside zone' : '✅ In zone'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMembersModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FAB (only shown when not in a huddle) */}
      {!huddleActive && (
        <View style={[styles.preHuddleActions, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
            <Text style={styles.joinButtonText}>Join a Huddle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
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
              {friendsLoading && <Text style={styles.emptyFriendsText}>Loading friends...</Text>}
              {!friendsLoading && filteredFriends.length === 0 && <Text style={styles.emptyFriendsText}>No friends yet.</Text>}
              {filteredFriends.map(friend => {
                const selected = selectedFriends.includes(friend.id);
                return (
                  <TouchableOpacity key={friend.id} style={[styles.friendRow, selected && styles.friendRowSelected]} onPress={() => toggleFriendSelect(friend.id)}>
                    <View style={[styles.friendAvatar, { backgroundColor: selected ? PURPLE : '#E0E0E0' }]}>
                      <Text style={[styles.friendAvatarText, { color: selected ? 'white' : '#666' }]}>{friend.initials}</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      {!!friend.phone && <Text style={styles.friendPhone}>{friend.phone}</Text>}
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

              {/* End time */}
              <Text style={styles.modalLabel}>Ends in</Text>
              <View style={styles.endTimeRow}>
                <Text style={styles.endTimeText}>{durationMinutes} min</Text>
                <Text style={styles.endTimeSubText}>
                  (ends at {formatTime(new Date(Date.now() + durationMinutes * 60_000))})
                </Text>
              </View>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={5}
                maximumValue={180}
                step={5}
                value={durationMinutes}
                onValueChange={setDurationMinutes}
                minimumTrackTintColor={PURPLE}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={PURPLE}
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
  mePhotoWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
    backgroundColor: PURPLE,
  },
  mePhoto: { width: '100%', height: '100%' },

  // ── Alert banner ─────────────────────────────────────────
  banner: {
    position: 'absolute',
    left: 16, right: 16,
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
  },
  bannerAlert:     { backgroundColor: '#FEECEC', borderColor: RED },
  bannerInfo:      { backgroundColor: '#E8F0FE', borderColor: BLUE_INFO },
  bannerText:      { fontSize: 13, textAlign: 'center', fontWeight: '500' },
  bannerTextAlert: { color: RED },
  bannerTextInfo:  { color: BLUE_INFO },

  panicFlashOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#B00020',
    zIndex: 9999,
  },
  panicFlashInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  panicFlashTitle: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  panicFlashWho: {
    marginTop: 10,
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Top bar ──────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    left: 16, right: 16,
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
  sessionTimer: { fontSize: 11, color: '#777', marginTop: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteChip:  {
    backgroundColor: '#FFF1EC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inviteChipText: { color: PURPLE, fontSize: 13, fontWeight: '500' },
  gearBtn:  { padding: 4 },
  gearIcon: { fontSize: 20 },
  hideMenuBtn: {
    borderWidth: 0.5,
    borderColor: '#EEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  hideMenuText: { fontSize: 12, color: '#444', fontWeight: '600' },

  showMenuBtn: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: '#EEE',
  },
  showMenuText: { color: '#222', fontSize: 13, fontWeight: '700' },

  panicFloatingBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  panicFloatingText: { color: 'white', fontSize: 18, fontWeight: '900' },

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
    backgroundColor: '#FFF7F4',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#F6B19C',
  },
  codeText: { color: PURPLE, fontSize: 13, fontWeight: '500' },
  membersChip: {
    flex: 1,
    backgroundColor: '#FFF7F4',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#F6B19C',
  },
  membersText:   { color: PURPLE, fontSize: 13, fontWeight: '500' },
  inviteBtn:     { backgroundColor: PURPLE, borderRadius: 10, padding: 12, alignItems: 'center' },
  inviteBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  panicBtn: {
    marginTop: 10,
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  panicBtnDisabled: { opacity: 0.85 },
  panicBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  // ── FAB & Join button ────────────────────────────────────
  preHuddleActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fab: {
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
    backgroundColor: PURPLE,
    height: 52,
    justifyContent: 'center',
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
  emptyFriendsText: { fontSize: 12, color: '#999', textAlign: 'center', paddingVertical: 10 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#EBEBEB',
  },
  friendRowSelected: { borderColor: PURPLE, backgroundColor: '#FFF7F4' },
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
  locationOptionActive:    { backgroundColor: '#FFF1EC', borderColor: PURPLE },
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
    backgroundColor: '#FFF1EC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  dragHintText: { color: PURPLE, fontSize: 12, textAlign: 'center' },
  previewInfo: {
    backgroundColor: '#FFF7F4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#F6B19C',
  },
  previewInfoText: { color: PURPLE, fontSize: 12, textAlign: 'center' },

  endTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  endTimeText: { fontSize: 13, color: '#444', fontWeight: '600' },
  endTimeSubText: { fontSize: 12, color: '#666' },

  // ── Member list styles ───────────────────────────────────
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '500', color: '#222' },
  memberStatus: { fontSize: 12, color: '#666', marginTop: 2 },
});
