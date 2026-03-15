import React from "react";
import{View, Text, StyleSheet, ScrollView,FlatList} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Card from "./Card";


const DATA = [
    {id: '1', name: 'John Doe', description: 'Ex Slave master', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'},
    {id: '2', name: 'Jane Smith', description: 'Software Engineer', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'},
    {id: '3', name: 'Bob Johnson', description: 'Graphic Designer', imageUrl: 'https://cdn.discordapp.com/attachments/958149818503544882/1482484589648675029/hu.png?ex=69b71edd&is=69b5cd5d&hm=e4d371eeec964f4e8091d43a06e5d057579bab2e13cdc63a8225a6e34b9faf64&'}
]

const ITEM = ({name}) => (
    <View style = {styles.item}>
        <Text style={styles.friendText}>{name}</Text>
    </View>
);
const FriendsScreen = () => {
    const handleCardAction = (friendId) => {
        console.log('Action pressed for friend:', friendId);
        // Add your action handler here
    };

    return (
        <SafeAreaProvider style={{flexDirection: 'column'}}>
            <View style = {{height: 50, backgroundColor: '#fb7854 ', alignItems: 'center', justifyContent: 'center'}}>
                <Text style={styles.titleText}>Friend List</Text>
            </View>
            <FlatList
                data={DATA}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => <Card name={item.name} description={item.description} imageUrl={item.imageUrl} onButtonPress={() => handleCardAction(item.id)} />}
            />
        </SafeAreaProvider>
    );

}

const styles = StyleSheet.create({
    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        justifyContent: 'center'
    },

    friendText: {
        fontSize: 18,
        //marginVertical: 10
    },

   


})
export default FriendsScreen;