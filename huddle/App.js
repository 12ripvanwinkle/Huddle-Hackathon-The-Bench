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

<<<<<<< HEAD
// Auth flow
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={AuthScreen} />
    </Stack.Navigator>
  );
=======


// FRONTEND MAIN NAVIGATION
// Bottom tabs for the core GPS tracking features
function MainTabs({ session }) {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: PURPLE,
                tabBarInactiveTintColor: '#999',

                // FRONTEND: styling for bottom navigation
                tabBarStyle: {
                    height: 60,
                    paddingBottom: 8,
                    backgroundColor: 'white',
                    borderTopWidth: 0.5,
                    borderTopColor: '#EBEBEB',
                    elevation: 10,
                },

                headerShown: false,
            }}
        >

            {/* FRONTEND: Map tab */}
            {/* This tap this and the screen would display the live GPS tracking map */}
            <Tab.Screen
                name="Map"
                options={{
                    tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>🗺️</Text>,
                }}
            >
                {() => <MapScreen session={session} />}
            </Tab.Screen>


            {/* FRONTEND: Friends tab */}
            {/* Shows group members whose GPS location may be shared */}
            <Tab.Screen
                name="Friends"
                component={FriendsScreen}
                options={{

                    // UI icon for friends
                    tabBarIcon: ({ color }) =>
                        <Text style={{ fontSize: 20, color }}>👥</Text>,

                    headerShown: true,

                    // UI title
                    headerTitle: 'Group Members',

                    // HEADER STYLING
                    headerStyle: { backgroundColor: PURPLE, elevation: 0, shadowOpacity: 0},
                    headerTintColor: 'white',
                    headerTitleStyle: { fontWeight: '600', fontSize: 17},

                    // FRONTEND NAVIGATION: back button
                    headerLeft: ({ canGoBack, navigation}) =>
                        canGoBack
                            ? <BackButton onPress={() => navigation.goBack()} />
                            : null,

                    // BACKEND ACTION
                    // When user presses sign out, Supabase logs them out
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => supabase.auth.signOut()}
                            style={{ marginRight: 16}}
                        >
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                                Sign out
                            </Text>
                        </TouchableOpacity>
                    ),
                }}
            />
        </Tab.Navigator>
    );
>>>>>>> 337a461014d2bd0b85e3673444d0cb383badc532
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