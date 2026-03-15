import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';

const PURPLE = '#fb7854';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const Register = async () => {
    try {
      setLoading(true);
      if (!email || !password || !confirmPassword || !phone)
        throw new Error('Please fill in all fields.');

      if (password !== confirmPassword)
        throw new Error('Passwords do not match.');

      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            phone: phone,
          }
        }
      });
      if (error) throw error;

      Alert.alert('Account created! 🎉', 'You can now sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Auth') }
      ]);

      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhone('');
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account 🤝</Text>
        <Text style={styles.subtitle}>Join Huddle</Text>

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
          placeholder="Phone Number"
          onChangeText={(text) => setPhone(text)}
          value={phone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          onChangeText={(text) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Register()}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.primaryBtnText}>Sign Up</Text>
          }
        </TouchableOpacity>

        <Text style={styles.orText}>Already have an account?</Text>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Auth')}
          disabled={loading}
        >
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaProvider>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center',
    padding: 24, backgroundColor: PURPLE,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#333',
  },
  primaryBtn: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: PURPLE,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'white',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  orText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    fontSize: 14,
  },
});
