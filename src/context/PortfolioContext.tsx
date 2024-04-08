import React, { createContext, useEffect, useRef, useState } from 'react';
import Constants from "expo-constants";
import * as SQLite from 'expo-sqlite';
import { db, initDatabase } from '../database';
import { get } from 'http';


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

    const getExistingStock = async (symbol : string) => {

        return new Promise((resolve, reject) => {

            db.transaction(
            (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                `SELECT * FROM Stock WHERE symbol = ?`, [symbol], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    if (rs.rows.length > 0) {
                        const existingStock = rs.rows.item(0);
                        resolve(existingStock);
                    } else {
                        resolve(null); // ei löytynyt
                    }
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Some error' }));
        
            }
        );

        });
    }

    const getStockTransactions = async (stockId : number, type : string) => {

        return new Promise((resolve, reject) => {

            db.transaction(
            (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                `SELECT * FROM Transactions WHERE stockId = ? AND type = ?`, [stockId, type], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    if (rs.rows.length > 0) {
                        const transactions = rs.rows._array;
                        resolve(transactions);
                    } else {
                        resolve(null); // ei löytynyt
                    }
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Some error' }));
        
            }
        );

        });
    }

    const sellStock = async (existingStock : any, sellQuota: number) => {
        
        const buyTransactions  = await getStockTransactions(existingStock.id, 'Buy');

        let sellQuantity = sellQuota;

        for (const buyTransaction of buyTransactions) {

            const { id, quantity : buyQuantity, price : buyPrice } = buyTransaction;
            
            if (sellQuantity <= 0) {
                break;
            }

            if (buyQuantity >= sellQuantity) {

                if (buyQuantity === sellQuantity) {
                    db.transaction(
                        (tx : SQLite.SQLTransaction) => {
                            tx.executeSql(
                                `DELETE FROM Transactions WHERE id = ?`, [id], 
                                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                                    console.log('Transaction deleted');
                                });
                        }, 
                        (err: SQLite.SQLError) => {
                            console.log(err);
                            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                        }
                    );
                } else {
                    db.transaction(
                        (tx : SQLite.SQLTransaction) => {
                            tx.executeSql(
                                `UPDATE Transactions SET quantity = ? WHERE id = ?`, [buyQuantity - sellQuantity, id], 
                                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                                    console.log('Transaction updated');
                                });
                        }, 
                        (err: SQLite.SQLError) => {
                            console.log(err);
                            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                        }
                    );
                }

                sellQuantity = 0;
            
            } else {

                db.transaction(
                    (tx : SQLite.SQLTransaction) => {
                        tx.executeSql(
                            `DELETE FROM Transactions WHERE id = ?`, [id], 
                            (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                                console.log('Transaction deleted');
                            });
                    }, 
                    (err: SQLite.SQLError) => {
                        console.log(err);
                        setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                    }
                );

                sellQuantity -= buyQuantity;
            }
        }


    }

    const addTransaction = async (transaction : any) => {
        
        setIsLoading(true);

        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        try {

            const existingStock = await getExistingStock(transaction.symbol);

            if (existingStock) {

                if (transaction.type === 'Sell') {

                    sellStock(existingStock, transaction.quantity);
                }
                
            } else {
                //täysin uusi osake salkkuun
                
            }

            //lisää transaktio tietokantaan

            //laske päivitetyt määrät ja keskihinta


        } catch (error) {

        } finally {

            setIsLoading(false);
        }

        // try {

        //     db.transaction(
        //         (tx : SQLite.SQLTransaction) => {
        //           tx.executeSql(
        //             `INSERT INTO Transactions (type, date, quantity, price, fees, totalAmount, stockId)
        //             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        //             [transaction.type, transaction.date, transaction.quantity, transaction.price, transaction.fees, transaction.totalAmount, transaction.stockId], 
        //             (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
        //                 console.log('Transaction inserted successfully');
        //                 setErrors({});
        //               getPortfolio();
        //             });
        //         }, 
        //         (err: SQLite.SQLError) => {

        //             console.log(err);
        //             setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add transaction' }));
         
        //         }
        //     );

        // } catch (error) {

        //     console.error(error);
        //     setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed connection' }));

        // } finally {

        //     setIsLoading(false);
        // }


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

    const updateStockData = async (tx: SQLite.SQLTransaction, transaction: any) => {

        try {


            if () {
                //if there is existing st
            }

        } catch (error) {

        }

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

        try {

            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                  //ensin sql-lause, kyselyparametrit arrayna, käsittelijä tuloksille (nuolifunktona)
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
            
        } catch (error) {

            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed connection' }));

        } finally {

            setIsLoading(false);
        }


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
                                        }}>  
            {props.children}        
        </PortfolioContext.Provider>
    )
}