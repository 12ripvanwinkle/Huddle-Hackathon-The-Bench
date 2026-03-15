import React, { useState } from "react";
import { 
    View, Text, StyleSheet, Modal, Image, Button, 
    TouchableOpacity, Alert, Pressable, ScrollView 
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import ProfileCard from './ProfileCard';
import Card from '../screens/Card';
import { supabase } from "../services/supabase";
// const friend = {
//     id: 1,
//     name: 'John Doe',
//     description: 'Invited you to join the group "Hiking Buddies"',
//     imageUrl: 'https://randomuser.me/api/portraits/men}/1.jpg',}
// const invitations = () => {
//     return(
//         <Modal>
//             <View style={styles.centeredView}>
//                 <View style={styles.modalView}>
//                     <ScrollView>
//                          <Card 
//                                 key={friend.id}
//                                 name={friend.name} 
//                                 description={friend.description} 
//                                 imageUrl={friend.imageUrl} 
//                                 onButtonPress={() => handleCardAction(friend.id)} 
//                             />
//                     </ScrollView>
//                     <Button title="Close" onPress={() => setModalVisible(false)} color="#fb7854" />
//                 </View>
//             </View>
//         </Modal>
//     )
// }


const ProfileScreen = () => {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [avatar_initials, setAvatar_Initials] = useState("")
    const [loggingOut, setLoggingOut] = useState(false);
    const profile = async () => {
        const { data: { userData } } = await supabase.auth.getUsers();
        const { data, error } = await supabase
            .from('profiles')
            .select('username,email,avatar_initials');
        if (error) throw new Error("No Data Retrieved");
        if (data) {
            setUsername(data.username);
            setEmail(data.email);
            setAvatar_Initials(data.avatar_initials);
        }
    };

    // Modal and image picker state
    const [modalVisible, setModalVisible] = useState(false);
    const [profileImage, setProfileImage] = useState('https://ui-avatars.com/api/?name=User&background=fb7854&color=fff');

    // Pick image from library
    const pickImage = async () => {
        try {
            console.log('Starting image picker...');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('Permission status:', status);

            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to access your photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            console.log('Image picker result:', result);

            if (!result.canceled) {
                setProfileImage(result.assets[0].uri);
                Alert.alert('Success', 'Profile picture updated!');
                // TODO: Upload to Supabase and update user profile
            }
        } catch (error) {
            console.error('Image picker error:', error);
            // Fallback for emulator - allow entering image URL
            Alert.alert(
                'Image Picker Not Available',
                'On emulator, enter an image URL instead',
                [
                    { text: 'Enter URL', onPress: () => promptImageUrl() },
                    { text: 'Cancel' }
                ]
            );
        }
    };

    const promptImageUrl = () => {
        Alert.prompt(
            'Enter Image URL',
            'Paste an image URL:',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Set', onPress: (url) => {
                    if (url) {
                        setProfileImage(url);
                        Alert.alert('Success', 'Profile picture updated!');
                    }
                }}
            ],
            'plain-text'
        );
    };

    const handleLogout = () => {
        if (loggingOut) return;

        Alert.alert(
            "Log out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log out",
                    style: "destructive",
                    onPress: async () => {
                        setLoggingOut(true);
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) Alert.alert("Logout failed", error.message);
                        } catch (e) {
                            Alert.alert("Logout failed", e?.message ?? "Unknown error");
                        } finally {
                            setLoggingOut(false);
                        }
                    }
                },
            ]
        );
    };
    return (
        <SafeAreaProvider>
            <View style={styles.ScreenBack}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.topContent}>
                        <Pressable 
                            onPress={pickImage}
                            style={({ pressed }) => [
                                styles.imageWrapper,
                                pressed && { opacity: 0.7 }
                            ]}
                        >
                            <Image source={{ uri: profileImage }} style={styles.logoImage} />
                            <Text style={styles.editText}>Tap to change</Text>
                        </Pressable>
                        <View style={styles.textContainer}>
                            <Text style={styles.titleText}>User Name</Text>
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <ProfileCard icon="📧" label="Email" value="user@example.com" />
                        <ProfileCard icon="📱" label="Phone" value="+1 (555) 123-4567" />
                    </View>

                    <View>
                        <Button 
                            title="Invitations" 
                            onPress={() => setModalVisible(true)} 
                            color="#fb7854" 
                        />
                    </View>

                    <View style={styles.spacer} />
                </ScrollView>

                <TouchableOpacity
                    style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    <Text style={[styles.logoutButtonText, loggingOut && styles.logoutButtonTextDisabled]}>
                        {loggingOut ? "Logging out..." : "Log Out"}
                    </Text>
                </TouchableOpacity>

                <Modal visible={modalVisible}>
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <ScrollView>
                                {/* <Card 
                                    key={friend.id}
                                    name={friend.name} 
                                    description={friend.description} 
                                    imageUrl={friend.imageUrl} 
                                    onButtonPress={() => handleCardAction(friend.id)} 
                                /> */}
                            </ScrollView>
                            <Button title="Close" onPress={() => setModalVisible(false)} color="#fb7854" />
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
        ScreenBack: {
            flex: 1,
            backgroundColor: '#fb7854',
            flexDirection: 'column',
        },

        scrollContent: {
            flexGrow: 1,
        },

        topContent: {
            alignItems: 'center',
            paddingTop: 20,
        },

        infoSection: {
            marginTop: 20,
            marginBottom: 20,
        },

        textContainer: {
            marginTop: 12,
        },

        spacer: {
            flex: 1,
        },

        titleText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
        },

        nameText: {
            fontSize: 18,
            color: 'white',
            marginTop: 8,
        },

        imageWrapper: {
            alignItems: 'center',
        },

        editText: {
            color: 'white',
            fontSize: 12,
            marginTop: 8,
            fontStyle: 'italic',
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

        logoutButtonDisabled: {
            opacity: 0.8,
        },

        logoutButtonTextDisabled: {
            color: '#999',
        },
});

export default ProfileScreen;
