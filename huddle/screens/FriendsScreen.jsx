
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import Card from "./Card";
import { supabase } from "../services/supabase";
import HuddleModal from "./HuddleModal";

const makeAvatarUrl = (name) => {
    const safe = encodeURIComponent(name || "Friend");
    return `https://ui-avatars.com/api/?name=${safe}&background=fb7854&color=fff&size=128&bold=true`;
};

const RequestCard = ({ name, description, onAccept, onDecline }) => {
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
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const isFocused = useIsFocused();

    const handleCardAction = (friendId) => {
        console.log('Action pressed for friend:', friendId);
        // Add your action handler here
    };

    const loadFriendsAndRequests = useCallback(async () => {
        setLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            const user = userData?.user;
            if (!user) {
                setFriends([]);
                setRequests([]);
                return;
            }

            const userId = user.id;
            const { data: rows, error } = await supabase
                .from('friends')
                .select('id, user_id, friend_id, status, action_user_id, created_at, updated_at')
                .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
                .limit(500);

            if (error) throw error;

            const incoming = (rows || []).filter(r => r.status === 'pending' && r.friend_id === userId);
            const accepted = (rows || []).filter(r => r.status === 'accepted');

            const profileIds = Array.from(new Set([
                ...incoming.map(r => r.user_id),
                ...accepted.map(r => (r.user_id === userId ? r.friend_id : r.user_id)),
            ].filter(Boolean)));

            let profilesById = new Map();
            if (profileIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_initials, avatar_url')
                    .in('id', profileIds);

                if (profilesError) throw profilesError;
                profilesById = new Map((profiles || []).map(p => [p.id, p]));
            }

            const requestUi = incoming.map(r => {
                const p = profilesById.get(r.user_id);
                const name = p?.username || p?.full_name || 'Member';
                return {
                    id: r.id,
                    from_user_id: r.user_id,
                    name,
                    description: 'sent you a friend request',
                };
            });

            const friendsUi = accepted.map(r => {
                const otherId = r.user_id === userId ? r.friend_id : r.user_id;
                const p = profilesById.get(otherId);
                const name = p?.username || p?.full_name || 'Friend';
                const description = 'Friend';
                const imageUrl = p?.avatar_url || makeAvatarUrl(name);
                return { id: otherId, name, description, imageUrl };
            });

            setRequests(requestUi);
            setFriends(friendsUi);
        } catch (e) {
            console.log('Friends load error:', e?.message ?? e);
            setFriends([]);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isFocused) return;
        void loadFriendsAndRequests();
    }, [isFocused, loadFriendsAndRequests]);

    const handleAccept = async (requestRowId) => {
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            const userId = userData?.user?.id;
            if (!userId) throw new Error('Not signed in');

            const { error } = await supabase
                .from('friends')
                .update({ status: 'accepted', action_user_id: userId, updated_at: new Date().toISOString() })
                .eq('id', requestRowId);

            if (error) throw error;
            void loadFriendsAndRequests();
        } catch (e) {
            Alert.alert('Error', e?.message ?? 'Could not accept request');
        }
    };

    const handleDecline = async (requestRowId) => {
        try {
            const { error } = await supabase
                .from('friends')
                .delete()
                .eq('id', requestRowId);

            if (error) throw error;
            void loadFriendsAndRequests();
        } catch (e) {
            Alert.alert('Error', e?.message ?? 'Could not decline request');
        }
    };

    return (
        <SafeAreaProvider>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.titleText}>Friends</Text>
                </View>
                
                <ScrollView style={styles.scrollView}>
                    {/* Friend Requests Section */}
                    {requests.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Friend Requests</Text>
                            {requests.map((request) => (
                                <RequestCard
                                    key={request.id}
                                    name={request.name}
                                    description={request.description}
                                    onAccept={() => handleAccept(request.id)}
                                    onDecline={() => handleDecline(request.id)}
                                />
                            ))}
                        </View>
                    )}

                    {/* Friends List Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Your Friends</Text>
                        {loading ? (
                            <Text style={styles.emptyText}>Loading...</Text>
                        ) : friends.length === 0 ? (
                            <Text style={styles.emptyText}>No friends yet.</Text>
                        ) : (
                            friends.map((friend) => (
                                <Card
                                    key={friend.id}
                                    name={friend.name}
                                    description={friend.description}
                                    imageUrl={friend.imageUrl}
                                    onButtonPress={() => handleCardAction(friend.id)}
                                />
                            ))
                        )}
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
        fontSize: 23,
        fontWeight: 'bold',
        color: 'white'
    },

    friendText: {
        fontSize: 18,
    },

    emptyText: {
        paddingHorizontal: 16,
        color: '#777',
        fontSize: 14,
        marginTop: 6,
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
