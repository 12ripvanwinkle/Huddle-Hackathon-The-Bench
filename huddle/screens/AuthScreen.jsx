import React from "react";
import { View, Text, TextInput, StyleSheet, Button} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const AuthScreen = () => {
  return (
    <SafeAreaProvider>
      <View>
        <Text>App Name</Text>
        <Text>Welcome Back</Text>
        <TextInput placeholder="Email" />
        <TextInput placeholder="Password" />
        <Button 
          title="Login"
          onPress={()=> showAlert("Login Pressed")}
        />
        <Text>Don't have an account? </Text>
        <Button 
          title="Sign Up"
          onPress={()=> showAlert("Sign Up Pressed")}
        />
      </View>
    </SafeAreaProvider>
  );        
};

export default AuthScreen;
