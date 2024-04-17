import React, { createContext, useEffect, useRef, useState } from 'react';
import Constants from "expo-constants";
import * as SQLite from 'expo-sqlite';
import { db, initDatabase } from '../database';

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

interface Transaction {
    id: number;
    date: string;
    fees: number | null;
    price: number;
    quantity: number;
    stockId: number;
    totalAmount: number | null;
    type: string;
}

interface Props {
    children : React.ReactNode;
}

const API_KEY : string = "V32DHHM2L02ITXRP"

//const API_KEY = Constants?.expoConfig?.extra?.ALPHA_VANTAGE_API_KEY;

export const PortfolioProvider: React.FC<Props> = (props: Props): React.ReactElement => {

    const fetched : React.MutableRefObject<boolean> = useRef(false);

    const [stocksList, setStocksList] = useState<StockInfo[]>([]);
    const [errors, setErrors] = useState<Error>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [closeValues, setCloseValues] = useState<any[]>([]);
    const [transactionData, setTransactionData] = useState<Transaction[]>([]);

    const validateTransactionCount = (symbol: string, quantity: string, type: string): boolean => {
    
        const trimmedQuantity = quantity.trim()
    
        if (trimmedQuantity === '') {
            setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter quantity' }));
            return false;
        }

        if (trimmedQuantity.includes(',') || trimmedQuantity.includes('.') || /^0\d+$/.test(trimmedQuantity) || /^\d+$/.test(trimmedQuantity) === false) {
            setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter a valid quantity' }));
            return false;
        }
 
        const quantityParsed = parseInt(trimmedQuantity);
    
        if (isNaN(quantityParsed) || quantityParsed < 1 || !Number.isInteger(quantityParsed)) {
            setErrors((prevErrors) => ({ ...prevErrors, quantity: 'Please enter a valid integer quantity' }));
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

        const trimmedPrice = price.trim();

        if (trimmedPrice === '') {
            setErrors((prevErrors) => ({ ...prevErrors, price: 'Please enter price' }));
            return false;
        }

        if (/^00|^0\d+/.test(trimmedPrice)) {
            setErrors((prevErrors) => ({ ...prevErrors, price: 'Please enter a valid price' }));
            return false;
        }
        
        const priceParsed = parseFloat(trimmedPrice.replace(',', '.'));

        if (isNaN(priceParsed) || !(priceParsed > 0)) {
            setErrors((prevErrors) => ({ ...prevErrors, price: 'Please enter number greater than 0' }));
            return false;
        }

        setErrors((prevErrors) => ({ ...prevErrors, price: '' }));  
        return true;
    }


    const validateTransactionFee = (fee : string) : boolean => {

        const trimmedFee = fee.trim();

        if (trimmedFee === '') {
            setErrors((prevErrors) => ({ ...prevErrors, fee: 'Please enter fee' }));
            return false;
        }

        if (/^00|^0\d+/.test(trimmedFee)) {
            setErrors((prevErrors) => ({ ...prevErrors, fee: 'Please enter a valid number' }));
            return false;
        }
        
        const feeParsed = parseFloat(fee.replace(',', '.'));

        if (isNaN(feeParsed) || feeParsed < 0) {
            setErrors((prevErrors) => ({ ...prevErrors, fee: 'Please enter a valid number' }));
            return false ;
        }

        setErrors((prevErrors) => ({ ...prevErrors, fee: '' }));
        return true;
    }

    const calculateStockValue = (stock: StockInfo) => {
        if (!closeValues || closeValues.length === 0) {
            return {
                value: 'N/A',
                percentageChange: null,
                percentageChangeStyle: null
            };
        }
    
        const closeValueObj = closeValues.find((item: any) => item.symbol === stock.symbol);
        if (!closeValueObj || !closeValueObj.closeValue) {
            return {
                value: 'N/A',
                percentageChange: null,
                percentageChangeStyle: null
            };
        }
    
        const value = parseFloat(closeValueObj.closeValue) * stock.quantity;
        const percentageChange = ((value - (stock.quantity * stock.avgPrice)) / (stock.quantity * stock.avgPrice)) * 100;
        const percentageChangeStyle: 'positive' | 'negative' | null = !isNaN(percentageChange) ? (percentageChange >= 0 ? 'positive' : 'negative') : null;
    
        return {
            value: value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
            percentageChange: isNaN(percentageChange) ? null : percentageChange.toFixed(2) + ' %',
            percentageChangeStyle: percentageChangeStyle
        };
    };
    

    // Get the stockId of an existing stock
    const getExistingStock = async (symbol : string) => {

        return new Promise((resolve, reject) => {

            db.transaction(
            (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                `SELECT * FROM Stock WHERE symbol = ?`, [symbol], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    if (rs.rows.length > 0) {
                        const stockId = rs.rows.item(0).id;
                        resolve(stockId);
                    } else {
                        resolve(null);
                    }
                    
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Some error' }));
                reject(err);
        
            }
        );

        });
    }

    // Get transactions for a stock
    const getStockTransactions = async (stockId : number, type : string) => {

        return new Promise((resolve, reject) => {
            
            db.transaction(
            (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                `SELECT * FROM Transactions WHERE stockId = ? AND type = ? ORDER BY date ASC`, 
                [stockId, type], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    if (rs.rows.length > 0) {
                        const transactions = rs.rows._array;
                        resolve(transactions);
                    } else {
                        resolve(null);
                    }
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Some error' }));
                reject(err);
        
            }
        );

        });
    }

    //sell stock using FIFO principle
    const sellStock = async (existingStock : number, sellQuota: number) => {

        const buyTransactions  = await getStockTransactions(existingStock, 'Buy') as Transaction[];

        if (!buyTransactions) {
    
            return; 
        }

        let sellQuantity : number = Number(sellQuota)

        for (let i = 0; i < buyTransactions.length; i++) {
            const buyTransaction = buyTransactions[i];
            const { id, quantity : buyQuantity } = buyTransaction;
            
            if (sellQuantity <= 0) {
                break;
            }

            // If the buy quantity is greater than or equal to the sell quantity
            if (buyQuantity >= sellQuantity) {

                // If the buy quantity is equal to the sell quantity - delete buy transaction in question
                if (buyQuantity === sellQuantity) {

                    await new Promise<void>((resolve, reject) => {
                        db.transaction(
                            (tx: SQLite.SQLTransaction) => {
                                tx.executeSql(
                                    `DELETE FROM Transactions WHERE id = ?`, [id],
                                    (_tx: SQLite.SQLTransaction, rs: SQLite.SQLResultSet) => {
                                        //console.log('Transaction deleted');
                                        resolve();
                                    });
                            },
                            (err: SQLite.SQLError) => {
                                console.log(err);
                                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                                reject(err); 
                            }
                        );
                    });

                    sellQuantity = 0;

                } else {

                    // If the buy quantity is greater than the sell quantity - update the buy transaction
                    await new Promise<void>((resolve, reject) => {
                        db.transaction(
                            (tx: SQLite.SQLTransaction) => {
                                tx.executeSql(
                                    `UPDATE Transactions 
                                    SET quantity = ?, 
                                        totalAmount = totalAmount - (? * price) 
                                        WHERE id = ?`, 
                                    [buyQuantity - sellQuantity, sellQuantity, id],
                                    (_tx: SQLite.SQLTransaction, rs: SQLite.SQLResultSet) => {
                                        resolve(); 
                                    });
                            },
                            (err: SQLite.SQLError) => {
                                console.log(err);
                                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                                reject(err);
                            }
                        );
                    });

                    sellQuantity = 0;
                }
            
            } else {
                // If the buy quantity is less than the sell quantity - delete the buy transaction
                await new Promise<void>((resolve, reject) => {
                    db.transaction(
                        (tx: SQLite.SQLTransaction) => {
                            tx.executeSql(
                                `DELETE FROM Transactions WHERE id = ?`, [id],
                                (_tx: SQLite.SQLTransaction, rs: SQLite.SQLResultSet) => {
                                    //console.log('Transaction deleted');
                                    resolve(); 
                                });
                        },
                        (err: SQLite.SQLError) => {
                            console.log(err);
                            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                            reject(err); 
                        }
                    );
                });

                sellQuantity -= buyQuantity;
            }
        }

    }

    // Insert a new stock to the database
    const insertNewStock = async (transaction : any) => {

        const price = parseFloat(transaction.price.replace(',', '.'));
        const quantity = parseInt(transaction.quantity);
        const fees = parseFloat(transaction.fees.replace(',', '.'));

        const totalAmount = (price * quantity) + fees;

        const avgPrice = totalAmount / quantity;

        db.transaction(
            (tx : SQLite.SQLTransaction) => {
              tx.executeSql(
                `INSERT INTO Stock (symbol, name, avgPrice, quantity)
                VALUES (?, ?, ?, ?)`,
                [transaction.symbol, transaction.name, avgPrice, transaction.quantity], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    //console.log('Stock inserted successfully');
                    setErrors({});
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add stock' }));
         
            }
        );

    }

    // Insert a new transaction to the database
    const insertTransaction = async (stockId : number, transaction : any) => {

        const price = parseFloat(transaction.price.replace(',', '.'));
        const quantity = parseInt(transaction.quantity);
        const fees = parseFloat(transaction.fees.replace(',', '.'));

        const totalAmount = (price * quantity) + fees;

        const avgPrice = totalAmount / quantity;

        return new Promise<void>((resolve, reject) => {

            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                    `INSERT INTO Transactions (type, date, quantity, price, fees, totalAmount, stockId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [transaction.type, transaction.date, transaction.quantity, avgPrice, transaction.fees, totalAmount, stockId], 
                    (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                        setErrors({});
                        resolve();
                    });
                }, 
                (err: SQLite.SQLError) => {

                    console.log(err);
                    setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add transaction' }));
                    reject(err);

                }
            );

        });
    }

    // Update stock data: calculate average price and total quantity
    const updateStockData = (stockId : number) => {
    
        return new Promise<void>((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql(
                        `SELECT stockId, quantity, totalAmount FROM Transactions WHERE type = 'Buy' AND stockId = ?`,
                        [stockId],
                        (tx, rs) => {

                            let totalQuantity = 0;
                            let totalCost = 0;
    
                            for (let i = 0; i < rs.rows.length; i++) {
                                const transaction = rs.rows.item(i);
                                const quantity = transaction.quantity;
                                const cost = transaction.totalAmount;

                                totalQuantity += quantity;
                                totalCost += cost;
                             
                            }

                            const avgPrice = totalCost / totalQuantity;
                        
                            db.transaction(
                                (tx) => {
                                    tx.executeSql(
                                        `UPDATE Stock SET avgPrice = ?, quantity = ? WHERE id = ?`,
                                        [avgPrice, totalQuantity, stockId],
                                        () => {
                                            //console.log('Stock updated for stockId:', stockId);
                                            resolve();
                                        },
                                        (tx, err) => {
                                            console.log(err);
                                            reject('Failed to update stock');
                                            return true;
                                        }
                                    );
                                },
                                (err) => {
                                    console.log(err);
                                    reject('Failed to update stock');
                                    return true;
                                }
                            );
                        },
                        (err) => {
                            console.log(err);
                            reject('Some error');
                            return true;
                        }
                    );
                },
                (err) => {
                    console.log(err);
                    reject('Some error');
                }
            );
        });
    };
    
    //handles flow of adding a transaction
    const addTransaction = async (transaction : any) => {
        
        setIsLoading(true);

        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        let newStockId : number = 0;

        try {

            const existingStock = await getExistingStock(transaction.symbol) as number;

            if (existingStock) {

                if (transaction.type === 'Sell') {

                    await sellStock(existingStock, transaction.quantity);
                }

                await insertTransaction(existingStock, transaction);    
                
            } else {
                
                await insertNewStock(transaction);

                newStockId = await getExistingStock(transaction.symbol) as number;
                await insertTransaction(newStockId, transaction);

                await getPortfolio();
                return;
            }

            await updateStockData(existingStock);

            await getPortfolio();


        } catch (error) {

            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add transaction' }));

        } finally {

            setIsLoading(false);
        }

    }

    //get latest stock values from alphavantage
    const getValues = async () => {
       
        const symbols = stocksList.map((stock) => stock.symbol);

        try {

            const requests = symbols.map((symbol) =>
                fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch data for symbol ${symbol}`);
                        }
                        return response.json();
                    })
            );
            
            const stockCloseValues = await Promise.all(requests)
            .then(responses =>
                responses.map((stockData, index) => {
                    const symbol = symbols[index];
                    if (!stockData || !stockData["Time Series (Daily)"]) {
                        throw new Error(`Data not available for symbol ${symbol}`);
                    }
                    const timeSeries = stockData["Time Series (Daily)"];
                    const dates = Object.keys(timeSeries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    if (dates.length === 0) {
                        throw new Error(`No data available for symbol ${symbol}`);
                    }
                    const latestDate = dates[0];
                    const closeValue = timeSeries[latestDate]["4. close"];
                    if (!closeValue) {
                        throw new Error(`Close value not available for symbol ${symbol}`);
                    }
                    return { symbol, closeValue };
                })
            );


            setCloseValues(stockCloseValues);
            setErrors({});

        } catch (error) {
            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to update values' }));
        }

    }

    //get portfolio data from the database
    const getPortfolio = async () => {

        setIsLoading(true);
        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        try {

            // Stock table
            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                  tx.executeSql(`SELECT * FROM Stock`, [], 
                    (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                      setStocksList(rs.rows._array);
                      setErrors({});
                    });
                }, 
                (err: SQLite.SQLError) => {
                    
                    console.log(err)
                    setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to get portfolio' }));
                }
            );
            
            //Transactions table
            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                  tx.executeSql(`SELECT * FROM Transactions`, [], 
                    (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                      setTransactionData(rs.rows._array);
                      //setErrors({});
                    });
                }, 
                (err: SQLite.SQLError) => {
                    
                    console.log(err)
                    setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to get transactions' }));
                }
            );
            
            
        } catch (error) {

            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed connection' }));

        } finally {

            setIsLoading(false);
        } 
        
    }
    
    
    useEffect(() => {

    if (!fetched.current) {

        initDatabase();

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
                                            transactionData,
                                            calculateStockValue
                                        }}>  
            {props.children}        
        </PortfolioContext.Provider>
    )
    
}