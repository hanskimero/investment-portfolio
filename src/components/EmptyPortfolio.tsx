import { StyleSheet, TouchableOpacity } from "react-native";
import { View, Text, ScrollView, StatusBar, Image } from "react-native";
import { Button, List, FAB, Title, ActivityIndicator, IconButton } from "react-native-paper";
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import { useContext } from "react";
import { useNavigation } from '@react-navigation/native';
import PortfolioList from "./PortfolioList";

const EmptyPortfolio : React.FC = () : React.ReactElement => {

  return (
    
    <View>
      <View style={styles.imgContainer}>
        <Image 
          source={require('../img/growth.png')} 
          style={styles.image}
        />
      </View>
      <View style={styles.titleContainer}>
        <Title>No stocks in your portfolio. Add some to get started!</Title>
      </View>
    </View>
       
    );
    
  }

  export default EmptyPortfolio;

  const styles = StyleSheet.create({
      image: {
          width: 100,
          height: 145,
          marginVertical: 20,
          
      },
      imgContainer: {
          alignItems: 'center',
      },
      titleContainer: {
          paddingHorizontal: 20,
          maxWidth: 300,
      },

    });
