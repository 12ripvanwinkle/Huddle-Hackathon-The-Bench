import React from 'react';
import {View, Text, StyleSheet,ScrollView,Button} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView from 'react-native-maps';

import {haversineDistance} from '../services/locationService';

//Functions

function distfromCenter(userCoords, huddleCircle) {
   return haversineDistance(huddleCircle.center,)
}
function isOutsidaASWE3(user) {}

// Provider is Leaflet
const MapScreen = () => {
  // const navigation = useNavigation(); 
    return (
        <View style={styles.container}>
            <Text>Some text</Text>
        </View>
        

    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },});
  

export default MapScreen