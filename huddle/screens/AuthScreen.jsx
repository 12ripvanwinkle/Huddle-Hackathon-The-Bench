
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, Image
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';

const PURPLE = '#fb7854';

const AuthScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const Login = async () => {
    try {
      setLoading(true);
      if (!email || !password)
        throw new Error('Please fill in all fields.');

      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;

      // No manual navigation needed
      // App.js onAuthStateChange handles it automatically

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Login failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const Register = async () => {
    try {
      setLoading(true);
      if (!email || !password)
        throw new Error('Please fill in all fields.');

      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) throw error;

      Alert.alert('Account created! 🎉', 'You can now sign in.');

    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Sign up failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Image source={require('../screens/Logo hackathon.png')} style={styles.logoImage}/>
        <Text style={styles.title}>Huddle</Text>
        <Text style={styles.subtitle}>Welcome New User :D</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          onChangeText={(text) => setEmail(text)}
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Login()}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.primaryBtnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <Text style={styles.orText}>Don't have an account?</Text>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={styles.secondaryBtnText}>Sign Up</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaProvider>
  );
};


export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center',
    padding: 24, backgroundColor: PURPLE,
  },
  title: {
    fontSize: 32, fontWeight: '700', fontFamily:'sans-serif',
    color: 'white', textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginBottom: 32,
  },
  input: {
    backgroundColor: 'white', borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 16, color: '#222',
  },
  primaryBtn: {
    backgroundColor: 'white', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: {
    color: PURPLE, fontWeight: '600', fontSize: 15,
  },
  orText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginBottom: 12,
  },
  secondaryBtn: {
    borderWidth: 1, borderColor: 'white',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  secondaryBtnText: {
    color: 'white', fontWeight: '600', fontSize: 15,
  },
  logoImage:{
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 75,
    borderColor : 'white',
    borderWidth: 2,
  }
});


export default AuthScreen;

