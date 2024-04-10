import { StyleSheet } from "react-native";
import { View, Text, ScrollView, StatusBar, Image } from "react-native";
import { Appbar, TextInput, Button, Modal, Portal, List, PaperProvider, FAB, Title, ActivityIndicator, IconButton } from "react-native-paper";
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import { useContext, useState } from "react";
import { useNavigation } from '@react-navigation/native';
import { useEffect } from "react";
import Constants from "expo-constants";

//const API_KEY = Constants?.expoConfig?.extra?.ALPHA_VANTAGE_API_KEY;

const Start : React.FC = () : React.ReactElement => {

    const navigation = useNavigation();

    const { stocksList, errors, isLoading, closeValues, getValues, getPortfolio, transactionData } = useContext(PortfolioContext);

    //console.log('CloseValues: ', closeValues);

    const handleBuy = (stock : any) => {

        navigation.navigate("New transaction" as never, { stock: stock, type: "Buy" });

    };

    const handleSell = (stock : any) => {

      navigation.navigate("New transaction" as never, { stock: stock, type: "Sell" });

    };

    console.log('Stockslist:', stocksList);
    console.log('TransactionData:', transactionData);

    return (
        <View style={styles.container}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : errors.failure ? (
            <View>
              <View style={styles.imgContainer}>
                <Image 
                  source={require('../img/oops.png')} 
                  //style={styles.image}
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
            
          ) : stocksList.length === 0 ? (
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
          ) : (
            <ScrollView>

              <Button
                icon="refresh"
                mode="contained"
                style={styles.button}
                onPress={() => getValues()}
                >Get latest values
              </Button>

              {/* <IconButton 
                icon="refresh" 
                onPress={() => getValues()}
                style={{alignSelf: 'center', marginTop: 20}} 
                /> */}
              {errors.failure && <Text style={styles.errorText}>{errors.failure}</Text>}

              {stocksList.map((stock: StockInfo, index: number) => {
                  
                  const closeValueObj = closeValues.find((item : any) => item.symbol === stock.symbol);
                  const value = closeValueObj ? parseFloat(closeValueObj.closeValue) * stock.quantity : (stock.quantity * stock.avgPrice);
                  const percentageChange = ((value - (stock.quantity * stock.avgPrice)) / (stock.quantity * stock.avgPrice)) * 100;

                  return (
                      <List.Item
                          key={index}
                          title={stock.name.length > 12 ? stock.quantity + " " + stock.name.substring(0, 12) + "..." :  stock.quantity + " " + stock.name}
                          style={styles.listItem}
                          left={() => (
                              <View style={styles.iconButtonsContainer}>
                                  <IconButton style={styles.iconButton} icon="plus" onPress={() => handleBuy(stock)} />
                                  <IconButton style={styles.iconButton} icon="minus" onPress={() => handleSell(stock)} />
                              </View>
                          )}
                          right={() => (
                              <View style={styles.valueContainer}>
                                  <Text style={styles.valueText}>
                                    {closeValueObj ? value.toFixed(2) + ' USD' : 'N/A'}</Text>

                                  <Text style={ percentageChange > 0 ? styles.positive : percentageChange < 0 ? styles.negative : {}}>
                                    {closeValueObj ? percentageChange.toFixed(2) + ' %' : 'N/A'} </Text>
                              </View>
                          )}
                      />
                  );
              })}
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
        image: {
            width: 100,
            height: 145,
            marginVertical: 20,
            
        },
        imgContainer: {
            alignItems: 'center',
        },
        centeredContent: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
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
        changeText: {
            flex: 1,
            marginLeft: 10, 
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
        button: {
          width: 200,
          alignSelf: 'center',
          marginTop: 20,
        }

        
    });
