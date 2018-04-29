'use strict';

/**
 * Class for saving and retrieving trades. This implementation uses sqlite database.
 */

let sqlite3 = require('sqlite3').verbose(); // Add .verbose(); for debugging

let DB_FILE = 'trades.db'; // Default location


// queries
const CREATE_TABLE_TRADES = "CREATE TABLE IF NOT EXISTS trades ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        ext_id TEXT UNIQUE, \
        pair TEXT NOT NULL, \
        time REAL, \
        type TEXT, \
        price REAL NOT NULL, \
        volume REAL NOT NULL, \
        fee REAL) ;";

const CREATE_TABLE_POSITIONS = "CREATE TABLE IF NOT EXISTS positions ( \
    trade_id INTEGER PRIMARY KEY REFERENCES trades (id) ON DELETE CASCADE, \
    position REAL NOT NULL, \
    average_open REAL NOT NULL, \
    cash_pnl REAL NOT NULL, \
    total_pnl REAL NOT NULL, \
    total_fees REAL NOT NULL) ;";
;

const CREATE_VIEW_POSITIONS = "CREATE VIEW IF NOT EXISTS view_positions as  \
        SELECT id, datetime(time,'unixepoch') as time, pair, price, type, volume, \
        position, average_open, cash_pnl, fee, total_pnl, total_fees \
    FROM trades INNER JOIN positions ON trades.id = positions.trade_id ;";

const SAVE_TRADE = "INSERT INTO trades (ext_id, pair, time, type, price, volume, fee) VALUES (?, ?, ?, ?, ?, ?, ?) ;";
const SAVE_POSITION = "INSERT INTO positions (trade_id, position, average_open, cash_pnl, total_pnl, total_fees) VALUES (?, ?, ?, ?, ?, ?) ;";
const GET_POSITION = "SELECT * FROM (SELECT * FROM view_positions ORDER BY id DESC LIMIT ? ) ORDER BY id ASC;";
const GET_LAST_TRADE = "SELECT * FROM trades WHERE id = (SELECT MAX(id) FROM trades );";

const GET_LAST_POSITION = "SELECT * FROM positions WHERE trade_id = \
    (SELECT max(id) FROM trades INNER JOIN positions ON id = trade_id GROUP BY pair HAVING pair = ? );";

const GET_ALL_LAST_POSITIONS = "SELECT view_positions.pair as pair, position, average_open FROM view_positions \
    INNER JOIN (SELECT max(id) as last_id, pair FROM trades GROUP BY pair ) ON id = last_id ORDER BY id ASC;";

const zero_position = { trade_id: null,
    position: 0.0,
    average_open: null,
    cash_pnl: 0.0,
    total_pnl: 0.0,
    total_fees: 0.0};

class Storage {
    /** Manages the connection with the database */
    
    on_error(success_msg=null) {
        return (err) => {
            if (err) {
                console.error(err.message);
                throw err;
            }
            // if (success_msg) {
            //     console.log(success_msg);
        }
    }
    
    constructor(db_file) {
        this.db = new sqlite3.Database(db_file, this.on_error("Constructed Storage instance using " + db_file));
        this.init();
    }
    
    /** Create tables and initialize the database. */
    init() {
        this.db.serialize(() => {
            this.db.run(CREATE_TABLE_TRADES, this.on_error("Created table trades"))
            .run(CREATE_TABLE_POSITIONS, this.on_error("Created table positions"))
            .run(CREATE_VIEW_POSITIONS, this.on_error("Created view"))
            .run("PRAGMA foreign_keys=ON", this.on_error("Foreign keys enabled"));
        });
    }
    
    close() {
        this.db.close(this.on_error('Closed database connection'));
    }
    
    save_trade(trade) {
        return new Promise((resolve, reject) => {
            this.db.run(SAVE_TRADE, [trade.ext_id, trade.pair, trade.time, trade.type, trade.price, trade.vol, trade.fee], function(err) {
            if (err) {
                console.log(err.message);
                reject(err);
            }
                resolve(this.lastID);
            });
        });
    }
    
    save_position(position) {
        return new Promise((resolve, reject) => {
            this.db.run(SAVE_POSITION, [position.trade_id, position.position, position.average_open, position.cash_pnl, position.total_pnl, position.total_fees], function(err) {
            if (err) {
                console.log(err.message);
                reject(err);
            }
                resolve(this.lastID);
            });
        });
    }


    /**
     * Select and process the most recent rows from the position view, ordered from older to newest.
     * @param nr_rows  limit the result to the nr_rows most recent rows.
     * @param callback  function (err, row); Is called for each row in the result.
     * @return {integer} The total number of rows processed.
     * */
    retrieve_positions(nr_rows, callback) {
        return new Promise( (resolve, reject) => {
            this.db.each(GET_POSITION, [nr_rows], callback, function complete(err, nr_rows) {
                if (err) {
                    console.log(err.message);
                    reject(err);
                }
                resolve(nr_rows);
            });        
        });
    }
    
    get_last_trade() {
        return new Promise((resolve, reject) => {
            this.db.get(GET_LAST_TRADE, [], (err, row) => {
            if (err) {
                reject(err);
            }
            if (row) {
    //            console.log("Last Trade is:");
                row.price = parseFloat(row.price);
                row.volume = parseFloat(row.volume);
                row.fee = parseFloat(row.fee);
    //            console.log(`${row.id} ${row.ext_id}  ${row.pair} ${row.time} ${row.type} ${row.price.toFixed(2)} ${row.volume.toFixed(2)} ${row.fee.toFixed(2)}`);
                resolve(row);
            } else {
                console.log("No trades found!");
                resolve(null);
            }
            });
        });
    }
    
    get_last_position(pair) {
        return new Promise((resolve, reject) => {
            this.db.get(GET_LAST_POSITION, [pair], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            if (row) {
                row.position = parseFloat(row.position);
                row.average_open = parseFloat(row.average_open);
                row.cash_pnl = parseFloat(row.cash_pnl);
                resolve(row);
            } else {
                console.log("No previous position found!");
                resolve(zero_position);
            }
            });
        });
    }
    
    get_all_positions() {
        return new Promise((resolve, reject) => {
            this.db.all(GET_ALL_LAST_POSITIONS, [], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            }
            if (rows) {
                resolve(rows);
            } else {
                console.log("No positions found!");
                resolve([]);
            }
            });
        });
    }
}

module.exports.makeStorage = function (db_file = DB_FILE) {
    let storage = new Storage(db_file);
    return storage;
}
