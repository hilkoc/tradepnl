#!/usr/bin/env node

'use strict';

// This module is the command line interface for trade pnl app

const exchange = require('./exchange').makeExchange();
const storage = require('./storage').makeStorage();
const App = require('./tradepnl');
const app = new App(exchange, storage);


let path = require('path');
let pkg = require( path.join(__dirname, 'package.json') );

const parser = require('commander');

parser
    .version(pkg.verion)
    .option('--sync <sync>', 'If enabled, fetch new trades from the excange and save them in the database.')
    .parse(process.argv);


let log = function(msg) {
  console.log(msg);
}





async function show_trade_pnl(nr_rows) {
    log("Showing PnL for the last " + nr_rows + " trades.");
    
    const row_callback = function (err, row) {
        // id, time, pair, price, type, volume, position, average_open, cash_pnl, fee
        if (row) {
            log(`${row.id} ${row.time} ${row.pair} | ${row.price.toFixed(2)}  ${row.type} ${row.volume.toFixed(2)} |\
            p: ${row.position.toFixed(2)} ao: ${row.average_open.toFixed(2)}  c: ${row.cash_pnl.toFixed(2)} fee: ${row.fee.toFixed(2)}`)
        }
    }
    await app.process_trade_pnl(nr_rows, row_callback);
}


async function show_live_pnl(nr_rows) {
    log("\n==========\n==Live PnL\n==========\n");
    
    async function get_live_pnl(row) {
        let price = await exchange.get_rate(row.pair);
        let ao = row.average_open;
        let cash_pnl = row.position *(price - ao);
        let rel_pnl = (price / ao -1) * 100;
        let term = row.pair.substring(5);
        let msg = row.pair + " p: " + row.position.toFixed(2) + " ao: " + ao.toFixed(2) + " price: " + price.toFixed(2) +
            " PnL (" + term + "): " + cash_pnl.toFixed(2) + " PnL rel: " + rel_pnl.toFixed(2) + " %";         
        log(msg);
    }
    
    await app.process_live_pnl(get_live_pnl);
}


let main = async function(sync_new_trades) {
    log("Starting Trade PnL...");
    
    let nr_rows = 5;
    if (sync_new_trades) {
        let nr_new_trades = await app.fetch_new_trades();
        log("Fetched " + nr_new_trades + " trades.");
        // If no new trades, then show pnl for the last 5.
        nr_rows = Math.max(nr_new_trades, nr_rows);
    }

    await show_trade_pnl(nr_rows);
    await show_live_pnl(nr_rows);
    storage.close();
}


main(parser.sync);
//if ( typeof parser.pair !== 'undefined' && parser.pair ) {
//    main(parser.pair);
//} else { // if program was called with no arguments, show help.
//    parser.help();
//}
