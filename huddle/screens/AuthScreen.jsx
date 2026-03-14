import { useState, useEffect } from "react"
import { View, ScrollView, Text, Alert} from "react-native"
import { supabase } from "../services/supabase"
import { Session } from "@supabase/supabase-js"
import { Button, Input } from "react-native-elements"

const Auth = () =>{
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const Login = async () => {
        try{
            setLoading(false);
            if(!email || !password) 
                throw new error("Fill All Fields Required")

            const { data: { session }, error} = await supabase.auth.signInWithPassword({
                email: email,
                password:password,
            });
            if (error) throw error
            console.log(error)

            if(session){
                //Router.push("/home")
            }
            

        } catch(error){
    
            Alert.alert(error.message)
                c
            }
    }
}

