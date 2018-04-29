#!/usr/bin/env node

'use strict';

// This module is the command line interface for trade pnl app

const exchange = require('./exchange').makeExchange();
const storage = require('./storage').makeStorage();
const App = require('./tradepnl');
const app = new App(exchange, storage);

const pkg = require('./package.json');
const parser = require('commander');

parser
    .version(pkg.version, '-v, --version')
    .option('--no-sync', 'Do not fetch new trades from the exchange')
    .parse(process.argv);


let log = function(msg) {
  console.log(msg);
}


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



async function show_trade_pnl(nr_rows) {
    log("Showing PnL for the last " + nr_rows + " trades.\n");
    
    let h = ["id", "time               ", "pair    ", "price  ", "type", "volume", "position", "average_open", "cash_pnl ", "fee"];    
    let table = new Table(h);
    log(table.header_row_str());
    
    const row_callback = function (err, row) {
        if (row) {
            let r = [row.id, row.time, row.pair, row.price, row.type, row.volume, row.position, row.average_open, row.cash_pnl, row.fee]
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


let main = async function(sync_new_trades) {
    log("Starting Trade PnL...");
    
    let nr_rows = 5;
    if (sync_new_trades) {
        let nr_new_trades = await app.fetch_new_trades();
        log("Fetched " + nr_new_trades + " new trades.");
        // If no new trades, then show pnl for the last 5.
        nr_rows = Math.max(nr_new_trades, nr_rows);
    }

    await show_trade_pnl(nr_rows);
    await show_live_pnl(nr_rows);
    storage.close();
}


main(parser.sync);
