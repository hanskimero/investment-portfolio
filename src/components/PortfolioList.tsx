import { StyleSheet, TouchableOpacity } from "react-native";
import { View, Text } from "react-native";
import { List, IconButton } from "react-native-paper";
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import { useContext } from "react";
import { useNavigation } from '@react-navigation/native';

const PortfolioList : React.FC = () : React.ReactElement => {

  const navigation = useNavigation();

  const { stocksList, calculateStockValue } = useContext(PortfolioContext);

  const handleBuy = (stock : any) => {

      navigation.navigate("New transaction" as never, { stock: stock, type: "Buy" });

  };

  const handleSell = (stock : any) => {

    navigation.navigate("New transaction" as never, { stock: stock, type: "Sell" });

  };

  const navigateToDetails = (stock : any) => {

    navigation.navigate("Stock Details" as never, { stock: stock });

  }


  return (
    <>

    {/* List of stocks  */}
    {stocksList.filter((stock : StockInfo) => stock.quantity > 0).map((stock: StockInfo, index: number) => {

        const { value, percentageChange, percentageChangeStyle } = calculateStockValue(stock);

        return (
          <TouchableOpacity key={index} onPress={() => navigateToDetails(stock)}>
            <List.Item
                key={index}
                title={stock.name.length > 12 ? stock.name.substring(0, 12) + "..." :  stock.quantity + " " + stock.name}
                style={styles.listItem}
                left={() => (
                    <View style={styles.iconButtonsContainer}>
                        <IconButton style={styles.iconButton} icon="plus" onPress={() => handleBuy(stock)} />
                        <IconButton style={styles.iconButton} icon="minus" onPress={() => handleSell(stock)} />
                    </View>
                )}
                right={() => (
                    <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>{value}</Text>
                  
                        {percentageChange !== null ? (
                          <Text style={          
                            percentageChangeStyle === 'positive' ? styles.positive :
                            percentageChangeStyle === 'negative' ? styles.negative :
                            null
                          }>
                            {percentageChange}
                          </Text>
                        ) : (
                          <Text style={styles.valueText}>N/A</Text>
                        )}
                    </View>
                )}
            />
          </TouchableOpacity>
        );
    })}
       
    </>
    );
    
  }

  export default PortfolioList;

  const styles = StyleSheet.create({
     
      iconButtonsContainer: {
          flexDirection: 'row',
          marginRight: 1,
      },
      iconButton: {
          marginHorizontal: -5,
      },
      valueContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 5,
      },
      valueText: {
        marginRight: 10, 
      },
      positive: {
          color: 'green',
      },
      negative: {
          color: 'red',
      },
      listItem: {
        marginBottom: -20
      },
  

    });
