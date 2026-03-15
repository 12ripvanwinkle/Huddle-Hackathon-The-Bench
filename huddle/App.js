import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

import { supabase } from './services/supabase';

// FRONTEND SCREENS (UI pages)
import MapScreen from './screens/MapScreen';     // Screen that displays the GPS map
import FriendsScreen from './screens/FriendsScreen'; // Screen showing friends/group members
import AuthScreen from './screens/AuthScreen';   // Login / signup screen
import RegisterScreen from './screens/RegisterScreen'; // Screen for user registration

import * as Linking from 'expo-linking';
const prefix = Linking.createURL('/');


// FRONTEND NAVIGATION SETUP
const Tab = createBottomTabNavigator();   // Bottom navigation tabs
const Stack = createStackNavigator();     // Stack navigation for auth vs main app

// FRONTEND DESIGN CONSTANT
const PURPLE = '#534AB7';

// Simple back button
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
            <Text style={{ fontSize: 20, color:'white', marginTop: -2 }}>←</Text>
        </TouchableOpacity>
    );
}

// Main tabs navigator
function MainTabs({ session }) {
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
                    elevation: 10,
                },
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Map"
                options={{
                    tabBarIcon: ({ color }) => <Text style={{fontSize: 20, color}}>🗺️</Text>,
                }}
            >
                {() => <MapScreen session={session} />}
            </Tab.Screen>

            <Tab.Screen
                name="Friends"
                component={FriendsScreen}
                options={{
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
                    headerShown: true,
                    headerTitle: 'Group Members',
                    headerStyle: { backgroundColor: PURPLE, elevation: 0, shadowOpacity: 0},
                    headerTintColor: 'white',
                    headerTitleStyle: { fontWeight: '600', fontSize: 17},
                    headerLeft: ({ canGoBack, navigation}) =>
                        canGoBack
                            ? <BackButton onPress={() => navigation.goBack()} />
                            : null,
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
}

// Auth stack navigator
function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

// Root navigation
export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync('hidden');
            NavigationBar.setButtonStyleAsync('light');
        }
    }, []);

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: PURPLE
                }}
            >
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="dark" translucent backgroundColor="transparent" />

            {/* FRONTEND APP NAVIGATION ROOT */}
            <NavigationContainer linking={{ prefixes:[prefix] }}>

                {/* STACK NAVIGATION CONTROLS AUTH FLOW */}
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {session
                        ? <Stack.Screen name="Main">
                            {() => <MainTabs session={session} />}
                        </Stack.Screen>
                        : <Stack.Screen name="AuthStack" component={AuthStack} />
                    }
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
}