
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet
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
        <Text style={styles.title}>Huddle 🤝</Text>
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

const styles = StyleSheet.create({
  WelcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    alignContent: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  WelcomeBackText: {
    fontSize: 18,
    marginBottom: 20,
    alignContent: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },

  button:{
    backgroundColor: 'orange',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  }


})

export default AuthScreen;

