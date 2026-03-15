import react from "react";
import { View, Text, StyleSheet } from "react-native";

const ProfileCard = ({ icon, label, value }) => {
    return (
        <View style={style.card}>
            <Text style={style.icon}>{icon}</Text>
            <View style={style.content}>
                <Text style={style.label}>{label}</Text>
                <Text style={style.value}>{value}</Text>
            </View>
        </View>
    );
}

const style = StyleSheet.create({
    card:{
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        marginVertical: 6,
        marginHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 24,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label:{
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 2,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    }
})

export default ProfileCard;