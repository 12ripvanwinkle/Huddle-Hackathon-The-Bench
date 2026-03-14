import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { supabase } from './services/supabase';

// Import your screens
import MapScreen from './screens/MapScreen';
import FriendsScreen from './screens/FriendsScreen';
import AuthScreen from './screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const PURPLE = '#6B21A8';

// Main app with bottom tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          backgroundColor: 'white',
          borderTopWidth: 0.5,
          borderTopColor: '#EBEBEB',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
          tabBarLabel: 'Map',
        }}
      />

      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
          tabBarLabel: 'Friends',
        }}
      />
    </Tab.Navigator>
  );
}

// Auth flow
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// Root navigation
export default function App() {
  return (
    <>
      <MapScreen />
      <StatusBar style="auto" />
    </>
  );
}