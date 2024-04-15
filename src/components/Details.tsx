import { ScrollView, StyleSheet } from "react-native";
import { View, Text, StatusBar } from "react-native";
import { Button, Title, IconButton } from "react-native-paper";
import { PortfolioContext } from "../context/PortfolioContext";
import { useContext } from "react";
import { useNavigation, useRoute } from '@react-navigation/native';
import TransactionList from "./TransactionList";

type StockValue = {
  value: string;
  percentageChange: string | null;
  percentageChangeStyle?: "positive" | "negative" | null;
};

const Details : React.FC = () : React.ReactElement => {

    const navigation = useNavigation();
    const route = useRoute();

    const { closeValues, getValues, errors, calculateStockValue } = useContext(PortfolioContext);

    const { stock } = route.params;

    const handleBuy = (stock : any) => {

        navigation.navigate("New transaction" as never, { stock: stock, type: "Buy" });

    };

    const handleSell = (stock : any) => {

      navigation.navigate("New transaction" as never, { stock: stock, type: "Sell" });

    };

    const stockValue : StockValue = calculateStockValue(stock);

    return (
        <View style={styles.container}>
          <ScrollView style={styles.infoContainer}>
          <Title style={{marginBottom: 10}}>{stock.name}</Title>
          {closeValues.length > 0 ? (
            
            // Show stock value and perventage change here
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{stockValue.value}</Text>
              {stockValue.percentageChange !== null && (
                <Text style={[
                  styles.percentageText, 
                  stockValue.percentageChangeStyle === 'positive' ? styles.positive :
                  stockValue.percentageChangeStyle === 'negative' ? styles.negative :
                  null 
                ]}>
                  {stockValue.percentageChange}
                </Text>
              )}
            </View>
          
          ) : (

            // Show when close values are not available
            <View style={styles.updateContainer}>
              {errors.failure ? (
                <Text style={styles.errorText}>{errors.failure}</Text>
              ) : (
                <Text style={styles.updateText}>Get up-to-date value</Text>
              )}
              <IconButton
                icon="refresh"
                onPress={() => getValues()}
                style={{ marginLeft: 5, marginBottom: 8 }}
              />
            </View>

          )}

          {/* Basic information */}
          <Text style={styles.infoText}>Quantity: {stock.quantity}</Text>
          <Text style={styles.infoText}>Average Price: {stock.avgPrice.toFixed(2)} USD</Text>

          <Button 
            mode="contained" 
            style={styles.button}
            onPress={() => handleBuy(stock)}
            >Buy</Button>
          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => handleSell(stock)}
            >Sell</Button>

          <TransactionList />

          </ScrollView>
          <StatusBar />
        </View>
      );
      
    }

    export default Details;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
            justifyContent: 'flex-start',
        },
        infoContainer: {
            padding: 20,
            margin: 20,
        },
        valueText: {
          fontSize: 17,
          fontWeight: 'bold',
          marginRight: 5, 
          marginBottom: 10,
        },
        percentageText: {
          fontSize: 17,
          fontWeight: 'bold',
          marginBottom: 10,
          marginRight: 0,
      },
        infoText: {
            fontSize: 16,
            marginBottom: 7,
            marginRight: 10,
        },
        valueContainer: {
          flexDirection: 'row',
        },
        updateContainer: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        updateText: {
          fontSize: 17,
          fontStyle: 'italic',
          marginRight: 5, 
          marginBottom: 6,
        },
        errorText: {
            color: 'red',
            fontSize: 17,
            fontStyle: 'italic',
            marginRight: 5,
            marginBottom: 6,
            
        },
        positive: {
            color: 'green',
        },
        negative: {
            color: 'red',
        },
        button: {
          marginTop: 20,
        },

    });
