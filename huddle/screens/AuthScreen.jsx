import React from "react";
import { View, Text, TextInput, StyleSheet, Button} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const AuthScreen = () => {
  return (
    <SafeAreaProvider style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <View>
        <Text style={styles.WelcomeText}>App Name</Text>
        <Text style = {styles.WelcomeBackText}>Welcome Back</Text>
        <TextInput placeholder="Email" />
        <TextInput placeholder="Password" />
        <Button style={{backgroundColor: 'orange', padding: 10, borderRadius: 5, marginTop: 10}}
          title="Login"
          onPress={()=> showAlert("Login Pressed")}
        />
        <Text>Don't have an account? </Text>
        <Button color={'orange'}
          title="Sign Up"
          onPress={()=> showAlert("Sign Up Pressed")}
        />
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
