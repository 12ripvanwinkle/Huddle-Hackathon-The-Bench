
import React from "react";
import{View, Text, StyleSheet, ScrollView,FlatList} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";


const DATA = [
    {id: '1', name: 'John Doe'},
    {id: '2', name: 'Jane Smith'},
    {id: '3', name: 'Bob Johnson'}
]
const FriendsScreen = () => {
    return (
        <SafeAreaProvider style={{flexDirection: 'column'}}>
            <View style = {{height: 50, backgroundColor: 'orange', alignItems: 'center', justifyContent: 'center'}}>
                <Text style={styles.titleText}>Friend List</Text>
            </View>
            <ScrollView style={{margin: 10, padding: 10}}>
                <Text style={styles.friendText}>John Doe</Text>
                <Text style={styles.friendText}>Jane Smith</Text>
                <Text style={styles.friendText}>Bob Johnson</Text>
            </ScrollView>
            <FlatList>
                data={DATA}
            </FlatList>
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
    }
})
export default FriendsScreen;
