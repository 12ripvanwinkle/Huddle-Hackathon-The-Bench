import React from "react";
import { View, Text, Textinput, StyleSheet, Button} from "react-native";

const AuthScreen = () => {
  return (
    <View>
      <Text>App Name</Text>
      <Text>Welcome Back</Text>
      <Textinput placeholder="Email" />
      <Textinput placeholder="Password"></Textinput>
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
  );
};

export default AuthScreen;
