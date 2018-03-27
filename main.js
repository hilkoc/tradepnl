#!/usr/bin/env node

'use strict';

// cmd line interface for trade pnl app

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
        log(trades);
        for (const [key, value] of Object.entries(trades)) {
            log("\nKey is " + key);
            log(value);
        }

        let trade = trades[0];
        log(trade);
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

let main = function(pair) {
    log("Starting Trade PnL...");
    log("pair is " + pair);
    get_rate(pair);
//    get_balance();
    get_trades(0);
}



if ( typeof parser.pair !== 'undefined' && parser.pair ) {
    main(parser.pair);
} else { // if program was called with no arguments, show help.
    parser.help();
}
