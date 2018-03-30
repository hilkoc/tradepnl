'use strict';

/**
 * Class for saving and retrieving trades. This implementation uses sqlite
 * database.
 */

let sqlite3 = require('sqlite3').verbose();

let DB_FILE = 'trades.db'; // Default location


// queries
const CREATE_TABLE_TRADES = "CREATE TABLE IF NOT EXISTS trades ( \
        id INTEGER PRIMARY KEY AUTOINCREMENT, \
        ext_id TEXT UNIQUE, \
        pair TEXT, \
        time REAL, \
        type TEXT, \
        price REAL, \
        volume REAL, \
        fee REAL) ;";

const CREATE_TABLE_POSITIONS = "CREATE TABLE IF NOT EXISTS positions ( \
	trade_id INTEGER PRIMARY KEY REFERENCES trades (id) ON DELETE CASCADE, \
	position REAL, \
	average_open REAL, \
	cash_pnl REAL) ;";
;

const CREATE_VIEW_POSITIONS = "CREATE VIEW IF NOT EXISTS view_positions as  \
    	SELECT id, datetime(time,'unixepoch') as time, pair, price, type, volume, \
    	position, average_open, cash_pnl, fee \
	FROM trades INNER JOIN positions ON trades.id = positions.trade_id ;";

const SAVE_TRADE = "INSERT INTO trades (ext_id, pair, time, type, price, volume, fee) VALUES (?, ?, ?, ?, ?, ?, ?) ;";
const SAVE_POSITION = "INSERT INTO positions (trade_id, position, average_open, cash_pnl) VALUES (?, ?, ?, ?) ;";
const GET_POSITION = "SELECT * FROM view_positions ;";
const SELECT_LAST_TRADE = "SELECT * FROM trades WHERE id = (SELECT MAX(id) FROM trades ";
const GET_LAST_TRADE = SELECT_LAST_TRADE + ");";
const GET_LAST_TRADE_PAIR = SELECT_LAST_TRADE + "WHERE pair = ? );";

const GET_LAST_POSITION = "SELECT * FROM positions WHERE trade_id = \
    	(SELECT MAX(id) FROM trades WHERE trades.pair = ? );";

class Storage {
    /** Manages the connection with the database */
    
    constructor(db_file) {
        this.db = new sqlite3.Database(db_file, (err) => {
            if (err) {
                return console.error(err.message);
            }
        });
        this.init();
        console.log("Constructed Storage instance using " + db_file);
    }
    
    /** Create tables and initialize the database. */
    init() {
	this.db.serialize(() => {
            this.db.run(CREATE_TABLE_TRADES, (err) => {
                if (err) {
                    return console.error(err.message);
                }
            })
            .run(CREATE_TABLE_POSITIONS, (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Created table positions..');
            })
            .run(CREATE_VIEW_POSITIONS, (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Created view...');
            })
            .run("PRAGMA foreign_keys=ON", (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Foreign keys enabled');
            });
	});
    }
    
    close() {
        this.db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
                console.log('Closed the database connection.');
            }
        );
    }
    
    save_trade(trade) {
	return new Promise((resolve, reject) => {
	    console.log("saving trade " + trade);
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
	    console.log("saving position " + position);
	    this.db.run(SAVE_POSITION, [position.trade_id, position.position, position.average_open, position.cash_pnl], function(err) {
            if (err) {
        	console.log(err.message);
        	reject(err);
            }
            	resolve(this.lastID);
            });
	});
    }
    
    retrieve_positions() {
        this.db.each(GET_POSITION, [], (err, row) => {
            if (err) {
                throw err;
            }
            console.log(row);
            //console.log(`${row.id} ${row.ext_id}  ${row.pair} ${row.time} ${row.type} ${row.price} ${row.volume} ${row.fee}`);
        });
    }
    
    get_last_trade(pair = null) {
	let query = GET_LAST_TRADE;
	let params = [];
	if (pair) {
	    query = GET_LAST_TRADE_PAIR;
	    params.push(pair);
	}
	return new Promise((resolve, reject) => {
	    this.db.get(query, params, (err, row) => {
		if (err) {
		    reject(err);
		}
		if (row) {
		    console.log("Last Trade is:");
		    console.log(`${row.id} ${row.ext_id}  ${row.pair} ${row.time} ${row.type} ${row.price} ${row.volume} ${row.fee}`);
		    resolve(row);
		} else {
		    console.log("No trades found!");
		    resolve(null);
		}
	    });
	});
    }
    
    get_last_position(pair) {
	let query = GET_LAST_POSITION;
	let params = [pair];
	return new Promise((resolve, reject) => {
	    this.db.get(query, params, (err, row) => {
		if (err) {
		    reject(err);
		}
		if (row) {
		    console.log(`Last Position ${row.trade_id} ${row.position}  ${row.average_open}  ${row.cash_pnl}`);
		    resolve(row);
		} else {
		    console.log("No previous position found!");
		    let zero_position = { trade_id: null,
			    position: 0,
			    average_open: 1,
			    cash_pnl: 0 };
		    resolve(zero_position);
		}
	    });
	});
    }
    
}

module.exports.makeStorage = function (db_file = DB_FILE) {
    let storage = new Storage(db_file);
    return storage;
}
