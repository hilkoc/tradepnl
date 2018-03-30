#!/usr/bin/env node

'use strict';

// cmd line interface for trade pnl app
let storage = require('./storage').makeStorage();

let path = require('path');
let pkg = require( path.join(__dirname, 'package.json') );

const parser = require('commander');

parser
    .version(pkg.verion)
    .option('--pair <pair>', 'Currency pair to calculate PnL for')
    .parse(process.argv);


let log = function(msg) {
  console.log(msg);
}

// KRAKEN stuff, to move into separate module
let async_module = require('async');

/*
 * Before starting, run:  source api_keys.sh
 * where api_keys.sh is a file containing;
 * * export API_KEY=my_exchange_api_key
 * * export API_SECRET=my_exchange_api_private_key
 */
const key          = process.env.API_KEY; 
const secret       = process.env.API_SECRET; 
const KrakenClient = require('kraken-api');
const kraken       = new KrakenClient(key, secret);
 
async function get_balance() {
    // Display user's balance 
    try { 
        log(await kraken.api('Balance'));
    } catch(e) {
        log(e);
    }
}



// BTCUSD is  'XXBTZUSD'
async function get_rate(ccypair) {
    try { 
        log(await kraken.api('Ticker', { pair : ccypair } ) );
    } catch(e) {
        log(e);
    }
}


async function get_trades(since) {
    try {
        let history = await kraken.api('TradesHistory', { type : 'no position', start : 'T3KZB7-DGV5O-BJGN4C' } ); //'TJFQJU-2P7FB-EKRZ73'
        let trades = history.result.trades
        return trades;
    } catch(e) {
        log("Error in get trades");
        log(e);
    }
}

/* A trade looks like this
Key is TWVLTZ-K5FK6-SFOLL7
{ ordertxid: 'O3XL4L-X6BAK-CBJ6UU',
  postxid: 'TKH2SE-M7IF5-CFI7LT',
  pair: 'XETHZUSD',
  time: 1522164390.1206,
  type: 'sell',
  ordertype: 'limit',
  price: '468.95000',
  cost: '569.60307',
  fee: '0.91136',
  vol: '1.21463497',
  margin: '0.00000',
  misc: '' }


*/



let main = async function(pair) {
    log("Starting Trade PnL...");
    
    // connect to the db
    // TODO find the most recent trade

    // fetch all trades since the last trade from the exchange
    let new_trades = await get_trades(0);
    log("Fetched trades:\n");
    log(new_trades);
    log(new_trades.length);
    // sort the trades, oldest first
    // TODO
    
    // store the new trades in the database
    for (const [tx_id, trade] of Object.entries(new_trades)) {
        trade.ext_id = tx_id;
        log(trade);
        storage.save_trade(trade);
    }
    log("Saved all trades\n");
    // calculate position and pnl for the new trades
    // store those in the db
    //
    // output results. PnL for all new trades
    // if no new trades, then show the last 5.
    //
    // Fetch live spot and show live PnL

//    log("pair is " + pair);
//    get_rate(pair);
//    get_balance();
    
    let trades = storage.retrieve_positions();
    console.log(trades);
    storage.close();
}


main(parser.pair);
//if ( typeof parser.pair !== 'undefined' && parser.pair ) {
//    main(parser.pair);
//} else { // if program was called with no arguments, show help.
//    parser.help();
//}
