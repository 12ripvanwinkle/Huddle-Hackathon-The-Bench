import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Share, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';


// ════════════════════════════════════════════════════════════
// BACKEND IMPORTS — these are for Supabase
// ════════════════════════════════════════════════════════════

import { supabase } from '../services/supabase'
// This sends gps to supabase every 3s, gets your current gps once, asks phone for location access and the last function being a math helper
import {
    watchAndBroadcastLocation,
    getCurrentLocation,
    requestLocationPermission,
    getDistanceMeters
} from '../services/locationService';

// 
import {
    createSession,
    joinSession,
    leaveSession,
    endSession,
    subscribeToSession,
    getSessionMembers,
    formatDistance
} from '../services/huddleService';

// Frontend import for RadiusSlider (pure UI no backend)
import RadiusSlider from '../components/RadiusSlider'

// ════════════════════════════════════════════════════════════
// FRONTEND — UI constants (colors only)
// ════════════════════════════════════════════════════════════
const PURPLE = '#534AB7';
const RED = '#E24B4A';
const BLUE_INFO = '#1A73E8';
const BANNER_ALERT = 'alert';

export default function MapScreen({ session }) {

    // State varibales needed on the frontend aspect

    const [userLocation, setUserLocation] = useState(null);
    const [huddleActive, setHuddleActive] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [radius, setRadius]
}