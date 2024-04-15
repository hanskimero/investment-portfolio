import { StyleSheet } from "react-native";
import { View, Text, Image } from "react-native";
import { Button } from "react-native-paper";
import { PortfolioContext } from "../context/PortfolioContext";
import { useContext } from "react";

const Failure : React.FC = () : React.ReactElement => {

  const { errors, getPortfolio } = useContext(PortfolioContext);

  return (
    
    <View>
      <View style={styles.imgContainer}>
        <Image 
          source={require('../img/oops.png')} 
        />
      </View>
      <View style={styles.titleContainer}>
      <Text style={styles.errorText}>{errors.failure}</Text>
      </View>
      <Button
        mode="contained"
        onPress={() => getPortfolio()}
        style={{marginTop: 20}}
        > Try again </Button>
    </View>   
      
    );
    
  }

  export default Failure;

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
      errorText: {
          color: 'red',
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'center',
          marginHorizontal: 20,
          marginTop: 10,
      },

    });
