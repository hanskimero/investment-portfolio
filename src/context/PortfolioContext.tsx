import React, { createContext, useEffect, useRef, useState } from 'react';
import Constants from "expo-constants";
import * as SQLite from 'expo-sqlite';
import { db, initDatabase } from '../database';
import { get } from 'http';
import { useFocusEffect } from '@react-navigation/native';


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

const API_KEY = Constants?.expoConfig?.extra?.ALPHA_VANTAGE_API_KEY;

export const PortfolioProvider: React.FC<Props> = (props: Props): React.ReactElement => {

    const fetched : React.MutableRefObject<boolean> = useRef(false);

    const [stocksList, setStocksList] = useState<StockInfo[]>([]);
    const [errors, setErrors] = useState<Error>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [closeValues, setCloseValues] = useState<any[]>([]);
    const [transactionData, setTransactionData] = useState<Transaction[]>([]);

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
                        const stockId = rs.rows.item(0).id;
                        resolve(stockId);
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
            //tarkista sorttausjärjestys
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

    const sellStock = async (existingStock : number, sellQuota: number) => {
        
        console.log('Existing stock:', existingStock);

        const buyTransactions  = await getStockTransactions(existingStock, 'Buy') as Transaction[];

        console.log('Buy transactions:', buyTransactions);

        if (!buyTransactions) {
            console.log('No buy transactions found');
            return; // Exit the function if there are no buy transactions
        }

        //jostain syystä sellQuantity on string, muutetaan numberiksi
        let sellQuantity : number = Number(sellQuota)

        for (let i = 0; i < buyTransactions.length; i++) {
            const buyTransaction = buyTransactions[i];
            const { id, quantity : buyQuantity } = buyTransaction;
            
            if (sellQuantity <= 0) {
                break;
            }

            console.log('Typeof buyQuantity:', typeof buyQuantity);
            console.log('Typeof sellQuantity:', typeof sellQuantity);

            if (buyQuantity >= sellQuantity) {

                console.log('buyQuantity covers sellQuota', buyQuantity, sellQuantity)

                if (buyQuantity === sellQuantity) {
                    console.log('buyQuantity equals sellQuota, deleting transaction');

                    await new Promise<void>((resolve, reject) => {
                        db.transaction(
                            (tx: SQLite.SQLTransaction) => {
                                tx.executeSql(
                                    `DELETE FROM Transactions WHERE id = ?`, [id],
                                    (_tx: SQLite.SQLTransaction, rs: SQLite.SQLResultSet) => {
                                        console.log('Transaction deleted');
                                        resolve(); // Resolve the promise when the transaction is completed
                                    });
                            },
                            (err: SQLite.SQLError) => {
                                console.log(err);
                                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                                reject(err); // Reject the promise if an error occurs
                            }
                        );
                    });

                    console.log('Setting sellQuantity to 0');
                    sellQuantity = 0;

                } else {
                    console.log('buyQuantity larger than sellQuantity updating transaction');

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
                                        console.log('Transaction updated');
                                        resolve(); // Resolve the promise when the transaction is completed
                                    });
                            },
                            (err: SQLite.SQLError) => {
                                console.log(err);
                                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                                reject(err); // Reject the promise if an error occurs
                            }
                        );
                    });

                    console.log('Setting sellQuantity to 0');
                    sellQuantity = 0;
                }
            
            } else {
                console.log('buyQuantity smaller than sellQuantity, deleting transaction');

                await new Promise<void>((resolve, reject) => {
                    db.transaction(
                        (tx: SQLite.SQLTransaction) => {
                            tx.executeSql(
                                `DELETE FROM Transactions WHERE id = ?`, [id],
                                (_tx: SQLite.SQLTransaction, rs: SQLite.SQLResultSet) => {
                                    console.log('Transaction deleted');
                                    resolve(); // Resolve the promise when the transaction is completed
                                });
                        },
                        (err: SQLite.SQLError) => {
                            console.log(err);
                            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to sell stock' }));
                            reject(err); // Reject the promise if an error occurs
                        }
                    );
                });

                console.log('Subtracting buyQuantity from sellQuantity');

                sellQuantity -= buyQuantity;
            }
        }

    }

    const insertNewStock = async (transaction : any) => {

        console.log('Inserting new stock');

        const totalAmount = (Number(transaction.price) * Number(transaction.quantity)) + Number(transaction.fees);

        const avgPrice = (totalAmount) / Number(transaction.quantity);

        console.log('totalAmount:', totalAmount);
        console.log('avgPrice:', avgPrice);

        db.transaction(
            (tx : SQLite.SQLTransaction) => {
              tx.executeSql(
                `INSERT INTO Stock (symbol, name, avgPrice, quantity)
                VALUES (?, ?, ?, ?)`,
                [transaction.symbol, transaction.name, avgPrice, transaction.quantity], 
                (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                    console.log('Transaction inserted successfully');
                    setErrors({});
                });
            }, 
            (err: SQLite.SQLError) => {

                console.log(err);
                setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add stock' }));
         
            }
        );

    }


    const insertTransaction = async (stockId : number, transaction : any) => {

        const totalAmount = (Number(transaction.price) * Number(transaction.quantity)) + Number(transaction.fees);

        const avgPrice = (totalAmount) / Number(transaction.quantity);

        console.log('totalAmount:', totalAmount);
        console.log('avgPrice:', avgPrice);

        return new Promise<void>((resolve, reject) => {

            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                tx.executeSql(
                    `INSERT INTO Transactions (type, date, quantity, price, fees, totalAmount, stockId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [transaction.type, transaction.date, transaction.quantity, avgPrice, transaction.fees, totalAmount, stockId], 
                    (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                        console.log('Transaction inserted successfully');
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

    const updateStockData = (stockId : number) => {
        console.log('Updating stock data');

        //const stockStatistics : { [stockId : number]: { totalQuantity : number, totalPrice : number } } = {};
    
        return new Promise<void>((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql(
                        `SELECT stockId, quantity, totalAmount FROM Transactions WHERE type = 'Buy' AND stockId = ?`,
                        [stockId],
                        (tx, rs) => {
                            //const stockStatistics = {};
                            let totalQuantity = 0;
                            let totalCost = 0;
    
                            for (let i = 0; i < rs.rows.length; i++) {
                                const transaction = rs.rows.item(i);
                                //const stockId = transaction.stockId;
                                const quantity = transaction.quantity;
                                const cost = transaction.totalAmount;

                                console.log('cost in loop:', cost);

                                totalQuantity += quantity;
                                totalCost += cost;
                                
                                console.log('totalCost in loop:', totalCost);
                                console.log('totalQuantity in loop:', totalQuantity);
                             
                            }

                            console.log('totalQuantity in update:', totalQuantity);

                            const avgPrice = totalCost / totalQuantity;
                            console.log('avgPrice in update:', avgPrice);
                        
                            db.transaction(
                                (tx) => {
                                    tx.executeSql(
                                        `UPDATE Stock SET avgPrice = ?, quantity = ? WHERE id = ?`,
                                        [avgPrice, totalQuantity, stockId],
                                        () => {
                                            console.log('Stock updated for stockId:', stockId);
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
    

    const addTransaction = async (transaction : any) => {
        
        setIsLoading(true);

        setErrors((prevErrors) => ({ ...prevErrors, failure: '' }));

        let newStockId : number = 0;

        try {

            const existingStock = await getExistingStock(transaction.symbol) as number;

            console.log('Existing stock in addTransaction:', existingStock);

            if (existingStock) {

                if (transaction.type === 'Sell') {

                    await sellStock(existingStock, transaction.quantity);
                }

                //insert transaction to transactions table
                await insertTransaction(existingStock, transaction);

                
                
            } else {
                //täysin uusi osake salkkuun
                
                await insertNewStock(transaction);

                //insert transaction to transactions table
                newStockId = await getExistingStock(transaction.symbol) as number;
                await insertTransaction(newStockId, transaction);

                //haetaan salkku ja exit, ei tarvetta enää päivittää arvoja
                await getPortfolio();
                return;
            }

            //update stock data
            await updateStockData(existingStock || newStockId);
            await updateStockData(existingStock);

            await getPortfolio();


        } catch (error) {

            console.error(error);
            setErrors((prevErrors) => ({ ...prevErrors, failure: 'Failed to add transaction' }));

        } finally {

            setIsLoading(false);
        }

    }

    const getValues = async () => {
       
        const symbols = stocksList.map((stock) => stock.symbol);

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

        console.log('Getting portfolio');
        
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
            
            //tarkastetaan missä transaktioissa mennään
            db.transaction(
                (tx : SQLite.SQLTransaction) => {
                  //ensin sql-lause, kyselyparametrit arrayna, käsittelijä tuloksille (nuolifunktona)
                  tx.executeSql(`SELECT * FROM Transactions`, [], 
                    (_tx : SQLite.SQLTransaction, rs : SQLite.SQLResultSet) => {
                      setTransactionData(rs.rows._array);
                      setErrors({});
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
                                            transactionData
                                        }}>  
            {props.children}        
        </PortfolioContext.Provider>
    )
    
}