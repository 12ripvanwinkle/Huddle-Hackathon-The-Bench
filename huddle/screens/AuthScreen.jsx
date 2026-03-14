import { useState, useEffect } from "react"
import { View, ScrollView, Text, Alert, TouchableOpacity, TextInput} from "react-native"
import { supabase } from "../services/supabase"
import { Session } from "@supabase/supabase-js"
import { useRouter } from "expo-router"

const Auth = () =>{
    const Router = useRouter()
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const Login = async () => {
        try{
            setLoading(true);
            if(!email || !password) 
                throw new error("Fill All Fields Required")

            const { data: { session }, error} = await supabase.auth.signInWithPassword({
                email: email,
                password:password,
            });
            if (error) throw error
            console.log(error)

            if(session){
                Router.push("/home")
            }
            

        } catch(error){
            if(error instanceof Error){
                Alert.alert(error.message)
            }    
            } finally{
                setLoading(false)
            }
    }
    const Register = async () => {
        try{
            setLoading(true);
            if(!email || !password) 
                throw new Error("Fill All Fields Required")

            const { data: { session }, error} = await supabase.auth.signUp({
                email: email,
                password:password,
            });
            if (error) throw error
            console.log(error)

            if(session){
                Router.push("/home")
            }
            

        } catch(error){
            if(error instanceof Error);
            Alert.alert(error.message)
            } finally{
                setLoading(false)
            }
    }
    
    return (
    <SafeAreaProvider>
      <View>
        <Text>App Name</Text>
        <Text>Welcome Back</Text>
        <TextInput
        label = "Email"
        placeholder="Email" 
        onChangeText = {(text) => setEmail(text)}
        />
        <TextInput
        label = "Password"
        placeholder="Password"
        onChangeText = {(text) => setPassword(text)}
        />
        <Button 
          title="Login"
          onPress={()=> Login()}
        />
        <Text>Don't have an account? </Text>
        <Button 
          title="Sign Up"
          onPress={()=> Register()}
        />
      </View>
    </SafeAreaProvider>
  );      
  
  styles = StyleSheet.create({
    container: {},

  })

}


