import React from "react";
import { View, Text, StyleSheet, Image, Button, TouchableOpacity, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
//import { supabase } from "../services/supabase";

const ProfileScreen = () => {
    return (
        <SafeAreaProvider>
            <View style={styles.ScreenBack}>
                <View style={styles.topContent}>
                    <Image source={{uri: 'https://ui-avatars.com/api/?name=User&background=fb7854&color=fff'}} style={styles.logoImage}/>
                    <View style={styles.textContainer}>
                        <Text style={styles.titleText}>Profile Screen</Text>
                        <Text style={styles.nameText}>User Name</Text>
                        <Text style={styles.nameText}>User Email</Text>
                    </View>
                </View>

                <View style={styles.spacer} />

                <TouchableOpacity style={styles.logoutButton} onPress={() => Alert.alert('Sign Out')}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
        ScreenBack: {
            flex: 1,
            backgroundColor: '#fb7854',
            flexDirection: 'column',
        },

        topContent: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            marginTop: 40,
        },

        textContainer: {
            marginLeft: 16,
            flex: 1,
        },

        spacer: {
            flex: 1,
        },

        titleText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
        },

        nameText: {
            fontSize: 18,
            color: 'white',
            marginTop: 8,
        },

        logoImage:{
            width: 150,
            height: 150,
            borderRadius: 75,
            borderColor : 'white',
            borderWidth: 2,
        },

        logoutButton: {
            backgroundColor: 'white',
            padding: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },

        logoutButtonText: {
            color: '#fb7854',
            fontSize: 18,
            fontWeight: 'bold',
        },
});

export default ProfileScreen;