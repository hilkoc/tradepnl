'use strict';

/** Class for saving and retrieving trades.
 *  This implementation uses sqlite database.
 */

let sqlite3 = require('sqlite3');

let DB_FILE = 'trades.db'; // Default location


// queries
let CREATE_TABLE_TRADES = "CREATE TABLE IF NOT EXISTS trades ( \
		id INTEGER PRIMARY KEY AUTOINCREMENT, \
		ext_id TEXT UNIQUE, \
		pair TEXT, \
		time REAL, \
		type TEXT, \
		price REAL, \
		volume REAL, \
		fee REAL) ;";

let CREATE_TABLE_POSITIONS = "CREATE TABLE IF NOT EXISTS positions";
let SAVE_TRADE = "INSERT INTO trades (ext_id, pair, time, type, price, volume, fee) VALUES (?, ?, ?, ?, ?, ?, ?) ;";
let SAVE_POSITION = "";
let GET_POSITION = "SELECT * FROM trades ;";

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
		this.db.run(CREATE_TABLE_TRADES, (err) => {
			if (err) {
				return console.error(err.message);
			}
		});
		//this.db.run(CREATE_TABLE_POSITIONS);
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
	    console.log("saving trade " + trade);
	    this.db.run(SAVE_TRADE, [trade.ext_id, trade.pair, trade.time, trade.type, trade.price, trade.volume, trade.fee], function(err) {
	        if (err) {
	          return console.log(err.message);
	        }
	        // get the last insert id
	        console.log(`A row has been inserted with rowid ${this.lastID}`);
	      });
	}
	
	save_position(position) {
		
	}
	
	retrieve_positions() {
		this.db.each(GET_POSITION, [], (err, row) => {
			if (err) {
				throw err;
			}
			//console.log(`A row has been inserted with rowid ${this.lastID}`);
			console.log(`${row.id} ${row.ext_id}  ${row.pair} ${row.time} ${row.type} ${row.price} ${row.volume} ${row.fee}`);
		});
	}
	
}

module.exports.makeStorage = function () {
	let storage = new Storage(DB_FILE);
	return storage;
}
