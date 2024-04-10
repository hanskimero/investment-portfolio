import * as SQLite from 'expo-sqlite';

const db : SQLite.SQLiteDatabase = SQLite.openDatabase("portfolio.db");

const initDatabase = () => {

    db.transaction(
        (tx : SQLite.SQLTransaction) => {
          //tx.executeSql(`DROP TABLE Stock`);
          //tx.executeSql(`DROP TABLE Transactions`) // Poista tämän rivin kommentti, jos haluat määrittää taulun uuddestaan (poistaa myös sisällöt)
          tx.executeSql(`CREATE TABLE IF NOT EXISTS Stock (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          symbol TEXT,
                          name TEXT,
                          avgPrice REAL,
                          quantity INTEGER
                        )`);
          
          tx.executeSql(`CREATE TABLE IF NOT EXISTS Transactions (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          type TEXT,
                          date TEXT,
                          quantity INTEGER,
                          price REAL,
                          fees REAL,
                          totalAmount REAL,
                          stockId INTEGER,
                          FOREIGN KEY (stockId) REFERENCES Stock(id)
                        )`);
        }, 
        (err : SQLite.SQLError) => { 
          console.log(err) 
        }
      );
}

export { db, initDatabase };