import { StyleSheet } from "react-native";
import { View, ScrollView, StatusBar } from "react-native";
import { FAB, ActivityIndicator } from "react-native-paper";
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import { useContext } from "react";
import { useNavigation } from '@react-navigation/native';
import PortfolioList from "./PortfolioList";
import EmptyPortfolio from "./EmptyPortfolio";
import PortfolioOverview from "./PortfolioOverview";
import Failure from "./Failure";

const Start : React.FC = () : React.ReactElement => {

  const navigation = useNavigation();

  const { stocksList, errors, isLoading } = useContext(PortfolioContext);

  return (
    <View style={styles.container}>

      {/* Unable to fetch data. */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : stocksList.length === 0 && errors.failure ? (
        <Failure />
        
        // Empty portfolio
        ) : stocksList.filter((stock : StockInfo) => stock.quantity > 0).length === 0 ? (
          <EmptyPortfolio />
          
        ) : (
          // Portfolio with stocks
          <ScrollView>

            {/* Portfolio total info */}
            <PortfolioOverview />

            {/* List of stocks  */}
            <PortfolioList />
            
          </ScrollView>
        )}
        <FAB 
          icon="plus"
          style={styles.addButton}
          onPress={() => navigation.navigate("New transaction" as never)}
        />
        <StatusBar />
      </View>
    );
    
  }

  export default Start;

  const styles = StyleSheet.create({
      container: {
          flex: 1,
          backgroundColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
      },
      addButton: {
          position: 'absolute', 
          marginHorizontal: -30, 
          right: '50%', 
          bottom: 40 
      },

    });
