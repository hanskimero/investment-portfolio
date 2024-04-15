import { StyleSheet } from "react-native";
import { View, Text } from "react-native";
import { List, Subheading } from "react-native-paper";
import { PortfolioContext } from "../context/PortfolioContext";
import { useContext } from "react";
import { useNavigation, useRoute } from '@react-navigation/native';

const TransactionList : React.FC = () : React.ReactElement => {

    const navigation = useNavigation();
    const route = useRoute();

    const { transactionData } = useContext(PortfolioContext);

    const { stock } = route.params;

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatPrice = (price: number) => {
      return price.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
    }

    return (
 
      <View>
        <Subheading style={{marginTop: 20, marginBottom: -10}} >Transactions:</Subheading>
        <List.Section>
                {transactionData
                .filter((transaction : any) => transaction.stockId === stock.id)
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction: any, index: number) => {
                  return (
                    <List.Accordion
                      title={`${transaction.type} ${formatDate(transaction.date)}`}
                      key={index}
                      style={styles.listItem}
                    >
                      <List.Item
                        title={"Information"}
                        description={`${transaction.quantity} x ${formatPrice(transaction.price)}`}
                        titleStyle={{ fontSize: 14, fontWeight: 'bold' }}
                        descriptionStyle={{ fontSize: 12 }}
                        right={() => (
                          <Text style={styles.listTextStyle}>
                            {`TOTAL ${formatPrice(transaction.totalAmount)}`}
                          </Text>
                        )}
                      />
                    </List.Accordion>
                  )
                })}
              </List.Section>
        </View>
       
      );
      
    }

    export default TransactionList;

    const styles = StyleSheet.create({
        listItem: {
          marginBottom: -20,
        },
        listTextStyle: { 
          fontSize: 12, 
          color: '#333',
          marginTop: 16
        }

        
    });
