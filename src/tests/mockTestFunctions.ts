
export interface StockInfo {
    symbol : string,
    name : string,
    quantity : number,
    avgPrice : number,
}

export const mockStocksList : StockInfo[] = [ 
    {
    symbol: 'AAPL',
    name: 'Apple',
    quantity: 10,
    avgPrice: 160
    },
]

//mock closeValues
export const closeValues = [
    { symbol: 'AAPL', closeValue: "150" },
];

export const validateTransactionCount = (symbol: string, quantity: string, type: string): boolean => {
    
    const trimmedQuantity = quantity.trim()

    if (trimmedQuantity === '') {
        //setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter quantity' }));
        return false;
    }

    if (trimmedQuantity.includes(',') || trimmedQuantity.includes('.')) {
        //setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter a valid quantity' }));
        return false;
    }

    const quantityParsed = parseInt(trimmedQuantity);

    if (isNaN(quantityParsed) || quantityParsed < 1 || !Number.isInteger(quantityParsed)) {
        //setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter a valid integer quantity' }));
        return false;
    }

    if (type === 'Sell') {
        const stock = mockStocksList.find((stock) => stock.symbol === symbol);
        if (stock && stock.quantity < quantityParsed) {
            //setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Not enough stocks to sell' }));
            return false;
        }
    }

    //setErrors((prevErrors) => ({ ...prevErrors, quantity: '' }));
    return true;
}

export const validateTransactionPrice = (price : string) : boolean => {
    
    const priceParsed = parseFloat(price.replace(',', '.'));

    if (isNaN(priceParsed) || !(priceParsed > 0)) {
        //setErrors((prevErrors) => ({ ...prevErrors, price: 'Please enter number greater than 0' }));
        return false;
    }

    //setErrors((prevErrors) => ({ ...prevErrors, price: '' }));  
    return true;
}


export const validateTransactionFee = (fee : string) : boolean => {
    
    const feeParsed = parseFloat(fee.replace(',', '.'));

    if (isNaN(feeParsed) || feeParsed < 0) {
        //setErrors((prevErrors) => ({ ...prevErrors, fee: 'Please enter a number' }));
        return false ;
    }

    //setErrors((prevErrors) => ({ ...prevErrors, fee: '' }));
    return true;
}

export const calculateStockValue = (stock : any) => {
  
    let percentageChange: number = NaN;

    if (!closeValues || closeValues.length === 0) {
      return {
          value: 'N/A',
          //difference: null,
          percentageChange: null,
          percentageChangeStyle: null
      };
    }

    const closeValueObj = closeValues.find((item: any) => item.symbol === stock.symbol);
    const value = closeValueObj ? parseFloat(closeValueObj.closeValue) * stock.quantity : stock.quantity * stock.avgPrice;
    
    // Check if closeValueObj exists before calculating percentageChange
    if (closeValueObj) {
      percentageChange = ((value - (stock.quantity * stock.avgPrice)) / (stock.quantity * stock.avgPrice)) * 100;
    } else {
        return{
            value: 'N/A',
            percentageChange: null,
            percentageChangeStyle: null
        }
    }
    
    // Determine style based on percentage change
    let percentageChangeStyle : 'positive' | 'negative' | null;
    if (!isNaN(percentageChange)) {
      percentageChangeStyle = percentageChange >= 0 ? 'positive' : 'negative';
    } else {
      percentageChangeStyle = null;
    }

    return {
        //poistettu + " USD", min max fragments, locale string 
        value: value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
        //differenceTotal: differenceTotal.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
        percentageChange: isNaN(percentageChange) ? null : percentageChange.toFixed(2) + ' %',
        percentageChangeStyle: percentageChangeStyle
    };
};