'use strict';

// Test case for trade pnl app
const TEST_DB_FILE  = 'test_trades.db'; 

class MockExchange {
    
    constructor() {
        this.trade_gen = this._get_next_trades();
    }
    
    * _get_next_trades(since, offset) {
        let trades = [];
        
        let trade = { ordertxid: 'OGY2WA-UQ46X-RXO3N6',
                postxid: 'TKH2SE-M7IF5-CFI703',
                pair: 'XBTZUSD',
                time: 1522320544.7156,
                type: 'sell',
                ordertype: 'limit',
                price: '10000.0000',
                cost: '10000.0000',
                fee: '16.00',
                vol: '1.0',
                margin: '0.00000',
                misc: '' }
        trades.push(trade);
        
        trade = { ordertxid: 'OGY2WA-UQ46X-RXO3N5',
                postxid: 'TKH2SE-M7IF5-CFI702',
                pair: 'XBTZUSD',
                time: 1522320533.7156,
                type: 'buy',
                ordertype: 'limit',
                price: '8000.0000',
                cost: '16000.0000',
                fee: '25.6000',
                vol: '2.0',
                margin: '0.00000',
                misc: '' }
        trades.push(trade);
        
        trade = { ordertxid: 'OGY2WA-UQ46X-RXO3N4',
                postxid: 'TKH2SE-M7IF5-CFI701',
                pair: 'XBTZUSD',
                time: 1522320522.7156,
                type: 'buy',
                ordertype: 'limit',
                price: '9500.0000',
                cost: '9500.0000',
                fee: '15.2000',
                vol: '1.0',
                margin: '0.00000',
                misc: '' }
        trades.push(trade);
        
        console.log("Returning promised mock trades.");
        
        yield new Promise( (resolve, reject) => {
            resolve(trades);
        });
        
        yield new Promise( (resolve, reject) => {
            resolve([]);
        });
    }
    
    get_trades(since, offset) {
        return this.trade_gen.next().value
    }
}

/** Clean the test database before start.*/
const fs = require('fs');
fs.unlink(TEST_DB_FILE, (err, x) => {});

const exchange = new MockExchange(); //require('./exchange').makeExchange();
const storage = require('./storage').makeStorage(TEST_DB_FILE);
const App = require('./tradepnl');
const app = new App(exchange, storage);

/** For pretty printing */
class Table {
    
    constructor(headers) {
        this.MIN_COL_WIDTH = 6;
        this.SEP = " ";
        this.headers = headers;
        this.hl = [];
        for (let i = 0; i < headers.length; i++) {
            // pad headers to min width
            let h = headers[i];
            h = h.padEnd(this.MIN_COL_WIDTH);
            this.headers[i] = h;
            this.hl[i] = h.length;
        }
    }
    
    header_row_str() {
        let s = "";
        for (let i = 0; i < this.headers.length; i++) {
            s += this.headers[i] + this.SEP;
        }
        return s;
    }
    
    
    // Assume row values are in the same order as the headrs.
    row_to_str(r) {
        let s = "";
        for (let i = 0; i < this.headers.length; i++) {
            let v = r[i];
            if (typeof v == 'number') {
                v = v.toFixed(2);
            }
            s += v.padStart(this.hl[i]) + this.SEP;
        }
        return s;
    }
}


let log = function(msg) {
    console.log(msg);
  }

async function show_trade_pnl(nr_rows) {
    log("Showing PnL for the last " + nr_rows + " trades.\n");
    
    let h = ["id", "time               ", "pair    ", "price  ", "type", "volume", "position", "average_open", "cash_pnl ", "fee", "total pnl", "total fees"];    
    let table = new Table(h);
    log(table.header_row_str());
    
    const row_callback = function (err, row) {
        if (row) {
            let r = [row.id, row.time, row.pair, row.price, row.type, row.volume, row.position, row.average_open, row.cash_pnl, row.fee, row.total_pnl, row.total_fees]
            log(table.row_to_str(r));
        }
    }
    await app.process_trade_pnl(nr_rows, row_callback);
}


async function show_live_pnl(nr_rows) {
    log("\n==========\n==Live PnL\n==========\n");
    
    let h = ["pair    ", "position", "average_open    ", "price   ", "PnL (term)      ", "PnL %"];    
    let table = new Table(h);
    log(table.header_row_str());
    
    async function get_live_pnl(row) {
        let price = await exchange.get_rate(row.pair);
        let ao = row.average_open;
        let cash_pnl = row.position *(price - ao);
        let rel_pnl = (price / ao -1) * 100;
        let term = row.pair.substring(5);
        
        let r = [row.pair, row.position, ao, price, cash_pnl, rel_pnl];        
        log(table.row_to_str(r));
    }
    
    await app.process_live_pnl(get_live_pnl);
}


async function test_app() {
    log("Testing Trade PnL...");
    let sync_new_trades = true;
    let nr_rows = 5;
    if (sync_new_trades) {
        log("Fetching mock trades.");
        let nr_new_trades = await app.fetch_new_trades();
        log("Fetched " + nr_new_trades + " new trades.");
        // If no new trades, then show pnl for the last 5.
        nr_rows = Math.max(nr_new_trades, nr_rows);
    }

    await show_trade_pnl(nr_rows);
    //await show_live_pnl(nr_rows);
    storage.close();    
}


test_app();
