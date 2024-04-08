import { FlatList, Keyboard, StyleSheet } from "react-native";
import { View, Text, ScrollView, StatusBar, TextInput, TouchableWithoutFeedback} from "react-native";
import { Appbar, Button, Modal, Portal, List, PaperProvider, Dialog, RadioButton } from "react-native-paper";
import DateTimePicker from '@react-native-community/datetimepicker';
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import React, { useContext, useState, useEffect } from "react";
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import symbolsData from '../symbols.json'
import RNDateTimePicker from "@react-native-community/datetimepicker";

interface formData {
  symbol? : string,
  name? : string,
  quantity? : string,
  price? : string,
  fee? : string,
  date : Date,
  type : string,

}

const AddTransaction : React.FC = () : React.ReactElement => {

    const navigation = useNavigation();
    const route = useRoute()
    const { stock, type } = route.params || {};

    const { addTransaction, validateTransactionCount, validateTransactionFee, validateTransactionPrice, errors, isLoading } = useContext(PortfolioContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<{ symbol: string; name: string; }[]>([]);

    const [formData, setFormData] = useState<formData>({
      type: 'Buy',
      date: new Date(),
    });

    const [dataComplete, setDataComplete] = useState<Boolean>(false);

    const filterSuggestions = (query : string) => {
      const formattedQuery = query.toLowerCase().trim();
      const filtered = symbolsData.filter(
        (item) =>
          item.symbol.toLowerCase().includes(formattedQuery) ||
          item.name.toLowerCase().includes(formattedQuery)
      );
      
      setSuggestions(filtered);
      setShowSuggestions(true);
    };

    const handleSearch = (text : string) => {
      setSearchQuery(text);
      filterSuggestions(text);
    };

    const handleSelectSuggestion = (symbol : string, name : string) => {
      setSearchQuery(symbol);
  
      setFormData((prevData) => ({
        ...prevData,
        symbol : symbol,
        name : name,
      }));

      setSuggestions([]); 
      setShowSuggestions(false);

    }

    const handleOuterPress = () => {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    const handlePress = () => {
      handleOuterPress();
      Keyboard.dismiss();
    }
  
    const onDateChange = (event, selectedDate) => {
      
      setFormData((prevData) => ({
        ...prevData,
        date : selectedDate,
      }));
      
    }

    const formHandler = (fieldName : string, value : string) : void => {
      
      let isValid = true;

      switch (fieldName) {
        case 'quantity':
          isValid = validateTransactionCount(formData.symbol, value, formData.type);
          break;
        case 'price':
          isValid = validateTransactionPrice(value);
          break;
        case 'fee':
           isValid = validateTransactionFee(value);
          break;
        case 'type':
          setFormData({ ...formData, type: value });
          break;
        default:
          break;
      }


      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: value,
      }));

      const isFormDataComplete = Object.values(formData).every((value) => !!value);
      setDataComplete(isValid && isFormDataComplete);

    }

    const handleSubmit = () => {

      addTransaction(formData);

      setFormData( { type: 'Buy', date: new Date()} )

      navigation.navigate('Portfolio' as never);

    }

    //tarkista onko tämä tarpeellinen?
    useEffect(() => {
      const isFormDataComplete = !!formData.symbol && !!formData.quantity && !!formData.price && !!formData.fee && !!formData.date;
      setDataComplete(isFormDataComplete);
    }, [formData]);

    useEffect(() => {
      if (stock && type) {
        setFormData((prevData) => ({
          ...prevData,
          symbol: stock.symbol,
          name: stock.name,
          type: type,
        }));
      }
    }, [stock, type]);

    useFocusEffect(
      React.useCallback(() => {
        // Function to reset form data
        const resetFormData = () => {
          setFormData({
            date: new Date(),
            type: 'Buy',
          });
        };
  
        // Cleanup function
        return () => {
          // Reset formData when navigating away from the component
          resetFormData();
        };
      }, [])
    );

    console.log('formData:', formData);
    console.log('errors:', errors);

    return (
      <TouchableWithoutFeedback onPress={handlePress}>
      <View style={styles.container}>
        <View style={styles.addContainer}>
        
        <Text style={styles.labelText}>Select transaction type:</Text>
        <View style={styles.rowContainer}>
          <RadioButton.Group onValueChange={(value) => formHandler('type', value)} value={formData.type!}>
            <View style={styles.RadioButtonRow}>
            <RadioButton.Item label="Buy" value="Buy" />
            <RadioButton.Item label="Sell" value="Sell" />
            </View>
          </RadioButton.Group>
        </View>
        
        <Text style={styles.labelText}>Company:</Text>
        <TextInput
          placeholder="Enter stock symbol or name"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="always"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.inputField}
        />
        {formData.name && <Text>{formData.name}</Text>}
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <List.Item
              title={`${item.name} (${item.symbol})`}
              onPress={() => handleSelectSuggestion(item.symbol, item.name)}
            />
          )}
          />

        <Text style={styles.labelText}>Transaction date:</Text>
        <View style={styles.rowContainer}>
        <RNDateTimePicker
            value={formData.date}
            mode={'date'}
            onChange={onDateChange}
            maximumDate={new Date()}
            style={styles.datePicker}
          />
        </View>
        <Text style={styles.labelText}>Count:</Text>
        <TextInput
          placeholder="Enter count"
          value={formData.quantity}
          onChangeText={(value: string) => formHandler('quantity', value)}
          keyboardType="numeric"
          style={styles.inputField}
          clearButtonMode={formData.quantity ? 'always' : 'never'}
        />
        {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
        <Text style={styles.labelText}>Unit Price:</Text>
        <TextInput
          placeholder="Enter unit price"
          value={formData.price}
          onChangeText={(value: string) => formHandler('price', value)}
          keyboardType="numeric"
          style={styles.inputField}
          clearButtonMode={formData.price ? 'always' : 'never'}
        />
        {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        <Text style={styles.labelText}>Costs:</Text>
        <TextInput
          placeholder="Enter fees"
          value={formData.fee}
          onChangeText={(value: string) => formHandler('fee', value)}
          keyboardType="numeric"
          style={styles.inputField}
          clearButtonMode={formData.fee ? 'always' : 'never'}
        />
        {errors.fee && <Text style={styles.errorText}>{errors.fee}</Text>}

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!dataComplete}
          style={{marginTop: 20}}
        > Save </Button>
        </View>
        </View>
        </TouchableWithoutFeedback> 
 
    )
        
        
    }

    export default AddTransaction;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
        },
        addContainer: {
          flexDirection: 'column',
            marginHorizontal: 20,
            marginVertical: 10,
        },
        rowContainer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        RadioButtonRow: {
          flexDirection: 'row',
        },
        inputField: {
          paddingHorizontal: 20,
          paddingVertical: 15,
          borderColor:"#ccc",
          borderWidth: 1,
          borderRadius: 5,
          marginBottom: 10,
        },
        datePicker: {
          marginBottom: 10,
        },
        errorText: {
          color: 'red',
        },
        labelText: {
          marginBottom: 5,
          marginTop: 10,
          fontWeight: 'bold',
          color: '#333',
        },
        
            
    });
