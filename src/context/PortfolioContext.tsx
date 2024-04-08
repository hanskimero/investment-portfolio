import React, { createContext, useEffect, useRef, useState } from 'react';
import Constants from "expo-constants";


export const PortfolioContext : React.Context<any> = createContext(undefined);

export interface StockInfo {
    symbol : string,
    name : string,
    quantity : number,
    avgPrice : number,
}

export interface Error {
    quantity? : string,
    price? : string,
    fee? : string,
    failure? : string
}


interface Props {
    children : React.ReactNode;
}

const API_KEY = Constants?.expoConfig?.extra?.ALPHA_VANTAGE_API_KEY;

export const PortfolioProvider: React.FC<Props> = (props: Props): React.ReactElement => {

    const fetched : React.MutableRefObject<boolean> = useRef(false);

    const [stocksList, setStocksList] = useState<StockInfo[]>([]);
    const [errors, setErrors] = useState<Error>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [closeValues, setCloseValues] = useState<any[]>([]);

    const validateTransactionCount = (symbol : string, quantity : string, type : string) : boolean => {
        //tarkistetaan, että osakkeita on positiivinen määrä, kokonaisluku
        //mikäli myynti, tarkistetaan, että osakkeita on tarpeeksi

        const trimmedQuantity = quantity.trim();

        if (trimmedQuantity === '') {
            setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter quantity' }));
            return false;
        }

        const quantityParsed = parseFloat(trimmedQuantity.replace(',', '.'));

        if (isNaN(quantityParsed) || quantityParsed < 1 || !(Number.isInteger(quantityParsed))) {
            setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter integer' }));
            return false;
        }

        if (type === 'Sell') {
            const stock = stocksList.find((stock) => stock.symbol === symbol);
            if (stock && stock.quantity < quantityParsed) {
                setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Not enough stocks to sell' }));
                return false;
            }
        }

        setErrors((prevErrors) => ({ ...prevErrors, quantity: '' }));  
        return true;
    }

    const validateTransactionPrice = (price : string) : boolean => {
        
        const priceParsed = parseFloat(price.replace(',', '.'));

        if (isNaN(priceParsed) || !(priceParsed > 0)) {
            setErrors((prevErrors) => ({ ...prevErrors, price: 'Please enter number greater than 0' }));
            return false;
        }

        setErrors((prevErrors) => ({ ...prevErrors, price: '' }));  
        return true;
    }


    const validateTransactionFee = (fee : string) : boolean => {
        
        const feeParsed = parseFloat(fee.replace(',', '.'));

        if (isNaN(feeParsed)) {
            setErrors((prevErrors) => ({ ...prevErrors, fee: 'Please enter a number' }));
            return false ;
        }

        setErrors((prevErrors) => ({ ...prevErrors, fee: '' }));
        return true;
    }

    const addTransaction = async (transaction : any) => {
        
        setIsLoading(true);

        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        //try {

        //     const connection = await fetch("http://192.168.68.57:3009/api/portfolio", {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json"
        //         },
        //         body: JSON.stringify(transaction)
        //     });

        //     console.log(connection.status);

        //     if (connection.ok) {

        //         setErrors({})
        //         getPortfolio();
                
        //     } else {
        //         console.error('Failed to add transaction');
        //         setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add transaction' }));
        //     }

        // } catch (error) {
        //     console.error(error);
        //     setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed connection' }));
        // } finally {

        //     setIsLoading(false);
        
        // }
    }
    
    const getValues =  async () => {

        const symbols : string[] = stocksList.map(stock => stock.symbol);
        console.log('symbols mapped:', symbols);

        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));
       
        try {

            const requests = symbols.map((symbol : any) => 
                fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`));

            const responses = await Promise.all(requests);
            const jsonData = await Promise.all(responses.map((response) => response.json()));
            
            const stockCloseValues = jsonData.map((stockData, index) => {
                const symbol = symbols[index];
                const timeSeries = stockData["Time Series (Daily)"];
                const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                const latestDate = dates[0];
                const closeValue = timeSeries[latestDate]["4. close"];
                return { symbol, closeValue };
            });
    

            setCloseValues(stockCloseValues);

        } catch (error) {
            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to update values' }));
        }

    }

    const getPortfolio = async () => {
        
        setIsLoading(true);
        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        // try {

        //     console.log('sending request to server');
        //     //tarkista, että ip on oikea
        //     const connection = await fetch("http://192.168.68.57:3009/api/portfolio");

        //     const data = await connection.json();

        //     setErrors({});

        //     setStocksList(data);

        // } catch (error) {

        //     console.error(error);
        //     setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed connection' }));
        // } finally {
        //     setIsLoading(false);
        // }
        
    
      };
    
    useEffect(() => {

    if (!fetched.current) {
        getPortfolio();
    }
        
    return () => { fetched.current = true }
    }, []);


    return (
        <PortfolioContext.Provider value={{ 
                                            stocksList, 
                                            setStocksList,
                                            getPortfolio,
                                            addTransaction,
                                            validateTransactionCount,
                                            validateTransactionPrice,
                                            validateTransactionFee,
                                            errors,
                                            isLoading,
                                            closeValues,
                                            getValues,
                                        }}>  
            {props.children}        
        </PortfolioContext.Provider>
    )
}