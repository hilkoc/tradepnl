#!/usr/bin/env node

'use strict';

// This module is the command line interface for trade pnl app

const storage = require('./storage').makeStorage();
const exchange = require('./exchange').makeExchange();

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



/** See https://github.com/askmike/gekko/issues/2028 */
function calculatePosition(trade, prev_position) {
    let trade_volume = trade.vol;
    let prev_volume = prev_position.position;
    let new_position, avg_open, cpnl;
    if (trade.type == 'buy') {
    new_position = prev_volume + trade_volume;
    
    avg_open = (prev_volume * prev_position.average_open + trade_volume * trade.price) / (prev_volume + trade_volume);
    cpnl = 0;
    } else {
    // Sell trade
    new_position = prev_volume - trade_volume;
    avg_open = prev_position.average_open;
    cpnl = trade_volume * (trade.price - avg_open);
    }

    let position = {  trade_id: null, // set after function returns
        position: new_position,
        average_open: avg_open,
        cash_pnl: cpnl };
    return position;
}


async function fetch_new_trades() {
    // find the most recent trade
    let last_trade = await storage.get_last_trade();
    log("Last trade");
    log(last_trade);
    
    // Fetch all trades since the last trade from the exchange
    let new_trades = await exchange.get_trades(last_trade ? last_trade.ext_id : null);
    
    // Sort the trades, oldest first. Important: Also convert strings to floats. 
    let sorted_trades = [];
    for (const [tx_id, trade] of Object.entries(new_trades)) {
        trade.ext_id = tx_id;
        trade.vol = parseFloat(trade.vol);
        trade.price = parseFloat(trade.price);
        trade.fee = parseFloat(trade.fee);
        sorted_trades.unshift(trade); // Add at beginning to reverse the order.
    }
    
    const nr_new_trades = sorted_trades.length;
    // Store the new trades in the database, while checking that they are sorted
    let index, trade, prev_trade;
    for (index = 0; index < sorted_trades.length; index++) {
    prev_trade = trade;
    trade = sorted_trades[index];
    
    if (prev_trade && trade.time < prev_trade.time) {
        console.error(`trade time: ${trade.time}  is before prev_trade time ${prev_trade.time}`);
        throw "Trades are not in order!"
    }
    
    log(trade.type + ' ' + trade.vol + '  at ' + trade.price);
    let lastID = await storage.save_trade(trade);
    
    // Calculate position and pnl for the new trades
    // Store those in the db
    let prev_position = await storage.get_last_position(trade.pair);
    let position = calculatePosition(trade, prev_position);
    position.trade_id = lastID;
    
    let position_id = await storage.save_position(position);
    log(position_id + '\n');
    }
    log("Saved all trades.\n");
    return nr_new_trades;
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
    await storage.retrieve_positions(nr_rows, row_callback);
}


async function show_live_pnl(nr_rows) {
    log("Showing live PnL");
    
    let rows = await storage.get_all_positions();
    log(rows);
    log(typeof rows);
    function get_live_pnl(row) {
    log(row);
    }

    rows.forEach(get_live_pnl);
}


let main = async function(sync_new_trades) {
    log("Starting Trade PnL...");
    
    let nr_rows = 5;
    if (sync_new_trades) {
        let nr_new_trades = await fetch_new_trades();
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
