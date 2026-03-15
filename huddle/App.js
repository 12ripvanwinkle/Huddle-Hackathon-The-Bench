
// FRONTEND: React & React Native imports used to build the mobile UI
import React, { useEffect, useState } from 'react';

// FRONTEND: Navigation libraries used to move between screens in the app
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// FRONTEND: UI components used to build the interface
import { Text, TouchableOpacity, Platform, View, ActivityIndicator } from 'react-native';

// FRONTEND: Expo UI utilities
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';

// BACKEND CONNECTION: Supabase client
// Supabase acts as the backend for authentication and possibly storing GPS data
import { supabase } from './services/supabase';

// FRONTEND SCREENS (UI pages)
import MapScreen from './screens/MapScreen';     // Screen that displays the GPS map
import FriendsScreen from './screens/FriendsScreen'; // Screen showing friends/group members
import ProfileScreen from './screens/ProfileScreen'; // User profile screen
import AuthScreen from './screens/AuthScreen';   // Login / signup screen
import RegisterScreen from './screens/RegisterScreen';

import * as Linking from 'expo-linking';
const prefix = Linking.createURL('/');
const linking = {
  prefixes: [prefix, 'huddle://'],
  config: {
    screens: {
      Main: {
        screens: {
          Map: 'join/:code',
        },
      },
    },
  },
};
// FRONTEND NAVIGATION SETUP
const Tab = createBottomTabNavigator();   // Bottom navigation tabs
const Stack = createStackNavigator();     // Stack navigation for auth vs main app

// FRONTEND DESIGN CONSTANT
// FRONTEND DESIGN CONSTANT
const PURPLE = '#534AB7';



// FRONTEND COMPONENT
// Simple reusable back button used in navigation headers
function BackButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginLeft: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 20, color: 'white', marginTop: -2 }}>←</Text>
    </TouchableOpacity>
  );
}



// FRONTEND MAIN NAVIGATION
// Bottom tabs for the core GPS tracking features
function MainTabs({ session }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60, paddingBottom: 8,
          backgroundColor: 'white',
          borderTopWidth: 0.5, borderTopColor: '#EBEBEB',
          elevation: 10,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Map"
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
        }}
      >
        {() => <MapScreen session={session} />}
      </Tab.Screen>

      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}



export default function App() {
    // FRONTEND STATE MANAGEMENT
    // session stores the logged-in user from the backend
    const [session, setSession] = useState(null);

    // loading state while authentication is checked
    const [loading, setLoading] = useState(true);


  useEffect(() => {
    // BACKEND: Check if user already has an active login session
    // Supabase returns session data if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // BACKEND: Listen for authentication changes
    // This runs when a user logs in or logs out
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    // Cleanup listener when component unmounts
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // FRONTEND (Android UI control)
    // Hides the Android navigation bar for immersive full-screen map experience
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
        NavigationBar.setButtonStyleAsync('light').catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial setup
    if (AppState.currentState === 'active' && Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setButtonStyleAsync('light').catch(() => {});
    }

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PURPLE }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }



  return (
    <>
      {/* FRONTEND STATUS BAR */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* FRONTEND APP NAVIGATION ROOT */}
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>

          {/* STACK NAVIGATION CONTROLS AUTH FLOW */}
          <Stack.Navigator screenOptions={{ headerShown: false }}>

            {/* AUTH LOGIC */}
            {/* If user is logged in → show main app (map + friends) */}
            {/* If user not logged in → show login screen */}

            {session ? (
              // User is logged in → Main app
              <Stack.Screen name="Main">
                {() => <MainTabs session={session} />}
              </Stack.Screen>
            ) : (
              // No session → show auth screens
              <>
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}

          </Stack.Navigator>

        </NavigationContainer>
      </SafeAreaProvider>
    </>
  );
}
