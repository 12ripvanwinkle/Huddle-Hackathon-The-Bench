
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, Button, Modal, TouchableOpacity, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Card from "./Card";
import { supabase } from "../services/supabase";
import HuddleModal from "./HuddleModal";


const DATA = [
    {id: '1', name: 'John Doe', description: 'Ex Slave master', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'},
    {id: '2', name: 'Jane Smith', description: 'Software Engineer', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'},
    {id: '3', name: 'Bob Johnson', description: 'Graphic Designer', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'}
]

const FRIEND_REQUESTS = [
    {id: 'req1', name: 'Alice Johnson', description: 'Product Manager', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'},
    {id: 'req2', name: 'Charlie Brown', description: 'UX Designer', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'}
]

const ITEM = ({name}) => (
    <View style = {styles.item}>
        <Text style={styles.friendText}>{name}</Text>
    </View>
);

const RequestCard = ({ name, description, imageUrl, onAccept, onDecline }) => {
    return (
        <View style={styles.requestCard}>
            <View style={styles.requestContent}>
                <Text style={styles.requestName}>{name}</Text>
                <Text style={styles.requestDescription}>{description}</Text>
            </View>
            <View style={styles.requestButtons}>
                <TouchableOpacity style={[styles.requestBtn, styles.acceptBtn]} onPress={onAccept}>
                    <Text style={styles.requestBtnText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.requestBtn, styles.declineBtn]} onPress={onDecline}>
                    <Text style={styles.requestBtnText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const FriendsScreen = () => {
    const [modalVisible, setModalVisible] = useState(false);

    const handleCardAction = (friendId) => {
        console.log('Action pressed for friend:', friendId);
        // Add your action handler here
    };

    const handleAccept = (requestId) => {
        console.log('Accepted friend request:', requestId);
    };

    const handleDecline = (requestId) => {
        console.log('Declined friend request:', requestId);
    };

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.titleText}>Friends</Text>
                </View>
                
                <ScrollView style={styles.scrollView}>
                    {/* Friend Requests Section */}
                    {FRIEND_REQUESTS.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Friend Requests</Text>
                            {FRIEND_REQUESTS.map((request) => (
                                <RequestCard
                                    key={request.id}
                                    name={request.name}
                                    description={request.description}
                                    imageUrl={request.imageUrl}
                                    onAccept={() => handleAccept(request.id)}
                                    onDecline={() => handleDecline(request.id)}
                                />
                            ))}
                        </View>
                    )}

                    {/* Friends List Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Your Friends</Text>
                        {DATA.map((friend) => (
                            <Card 
                                key={friend.id}
                                name={friend.name} 
                                description={friend.description} 
                                imageUrl={friend.imageUrl} 
                                onButtonPress={() => handleCardAction(friend.id)} 
                            />
                        ))}
                    </View>
                </ScrollView>

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setModalVisible(!modalVisible)}
                >
                    <Text style={styles.fabIcon}>+</Text>
                </TouchableOpacity>

                <HuddleModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column'
    },

    header: {
        height: 50,
        backgroundColor: '#fb7854',
        alignItems: 'center',
        justifyContent: 'center'
    },

    scrollView: {
        flex: 1,
    },

    sectionContainer: {
        paddingVertical: 15,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        paddingHorizontal: 16,
        marginBottom: 10,
        marginTop: 10,
    },

    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white'
    },

    friendText: {
        fontSize: 18,
    },

    requestCard: {
        backgroundColor: '#fff5f5',
        borderLeftWidth: 4,
        borderLeftColor: '#fb7854',
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    requestContent: {
        flex: 1,
    },

    requestName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },

    requestDescription: {
        fontSize: 14,
        color: '#666',
    },

    requestButtons: {
        flexDirection: 'row',
        gap: 8,
    },

    requestBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    acceptBtn: {
        backgroundColor: '#4CAF50',
    },

    declineBtn: {
        backgroundColor: '#f44336',
    },

    requestBtnText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },

    ScreenBack:{
        flex: 1,
        backgroundColor: '#fb7854',
        alignItems: 'center',
        justifyContent: 'center'
    },

    ModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center'
    },

    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fb7854',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },

    fabIcon: {
        fontSize: 30,
        color: 'white',
        fontWeight: 'bold',
    },
});

export default FriendsScreen;
