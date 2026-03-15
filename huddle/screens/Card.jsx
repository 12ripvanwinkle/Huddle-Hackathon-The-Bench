import React from 'react';
import { View, Text, TextInput, StyleSheet, Button,Image} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";


const Card = ({ name, description, imageUrl, onButtonPress }) => {
    return (
        <View style={styles.card}>
            <Image source={{uri: imageUrl || 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'}} style={styles.cardImage}/>
            <View style={styles.content}>
                <Text style={styles.cardcontent}>{name}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Action" onPress={onButtonPress} />
            </View>
        </View>
    )
};

const styles = StyleSheet.create({
    card:{
        backgroundColor: '#fb7854 ',
        borderRadius: 10,
        padding: 16,
        margin: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },

    cardcontent:{
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
    },

    cardDescription:{
        fontSize: 14,
        color: 'white',
        marginTop: 4,
    },

    cardImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },

    content:{
        flex: 1,
        marginLeft: 12,
    },

    buttonContainer:{
        justifyContent: 'flex-end',
    }
})


export default Card;