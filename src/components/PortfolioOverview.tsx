import { StyleSheet } from "react-native";
import { View, Text } from "react-native";
import { Button } from "react-native-paper";
import { PortfolioContext, StockInfo } from "../context/PortfolioContext";
import { useContext } from "react";

type PortfolioTotalResult = {
  totalValue: string;
  differenceTotal: string | null;
  percentageChangeTotal?: string | null; // Making percentageChangeTotal optional by adding "?"
  percentageChangeStyle: string | null;
};

const PortfolioOverview : React.FC = () : React.ReactElement => {

  const { stocksList, errors, closeValues, getValues } = useContext(PortfolioContext);

  const calculatePortfolioTotal = (stocksList : StockInfo[], closeValues : any[]) : PortfolioTotalResult=> {
    let portfolioTotal = 0;
    let totalAvgPrice = 0;

    const defaultResult = {
      totalValue: 'Please get updated values',
      difference: null,
      percentageChange: null,
      percentageChangeStyle: null
  };

    if (!closeValues || closeValues.length === 0) {
      return defaultResult;
    }

    stocksList.forEach((stock) => {
        const closeValueObj = closeValues.find((item) => item.symbol === stock.symbol);

        if (!closeValueObj || !closeValueObj.closeValue) {
            return defaultResult
        }

        const value = parseFloat(closeValueObj.closeValue) * stock.quantity;
        portfolioTotal += value;

        totalAvgPrice += stock.avgPrice * stock.quantity;
      });

    const differenceTotal = portfolioTotal - totalAvgPrice;
    const percentageChangeTotal = ((portfolioTotal - totalAvgPrice) / totalAvgPrice) * 100;
    
    let percentageChangeStyle = null;
    if (!isNaN(percentageChangeTotal)) {
      percentageChangeStyle = percentageChangeTotal >= 0 ? 'positive' : 'negative';
    }

    return {
        totalValue: portfolioTotal.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
        differenceTotal: differenceTotal.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
        percentageChangeTotal: percentageChangeTotal.toFixed(2) + '%',
        percentageChangeStyle: percentageChangeStyle
    };

  };

  const portfolioValues = calculatePortfolioTotal(stocksList, closeValues);

  return (
    <>
    <Button
      icon="refresh"
      mode="contained"
      style={styles.button}
      onPress={() => getValues()}
      >Get latest values
    </Button>

    {/* Portfolio total info */}
    {errors.failure ? (
      <Text style={styles.error}>{errors.failure}</Text>
    ) : (
      <View style={styles.portfolioInfo}>
        <Text style={styles.totalValueText}>{portfolioValues.totalValue}</Text>
        <Text style={[
          styles.totalPercentageText, 
          portfolioValues.percentageChangeStyle === 'positive' ? styles.positive :
          portfolioValues.percentageChangeStyle === 'negative' ? styles.negative :
          null
        ]}>
          {portfolioValues.percentageChangeTotal}
        </Text>
      </View>

    )}
    </>
  );    
  }

  export default PortfolioOverview;

  const styles = StyleSheet.create({
      error: {
          color: 'red',
          fontSize: 17,
          marginRight: 5, 
          marginBottom: 10,
          marginTop: 30,
      },
      positive: {
          color: 'green',
      },
      negative: {
          color: 'red',
      },
      button: {
        width: 200,
        alignSelf: 'center',
        marginTop: 20,
      },
      portfolioInfo: {
        flexDirection: 'row',
        marginTop: 30,
        marginLeft: 10,
        marginBottom: -10,
      },
      totalValueText: {
        fontSize: 17,
        marginRight: 5, 
        marginBottom: 10,
      },
      totalPercentageText: {
        fontSize: 17,
        marginBottom: 10,
        marginRight: 0,
    },

    });
