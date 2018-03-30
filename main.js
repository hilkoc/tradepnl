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


/** Since can be a timestamp or a tx_id. */
async function get_trades(since) {
    let params =  { type: 'no position'}
    if (since) {
	params.start = since;
    }
    try {
        let history = await kraken.api('TradesHistory', params ); //'TJFQJU-2P7FB-EKRZ73' // 'T3KZB7-DGV5O-BJGN4C'
        let trades = history.result.trades
        return trades;
    } catch(e) {
        log("Error in get trades");
        log(e);
        return [];
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


/** See https://github.com/askmike/gekko/issues/2028 */
function calculatePosition(trade, prev_position) {
    let trade_volume = trade.vol;
    let new_position, avg_open, cpnl;
    if (trade.type == 'buy') {
	new_position = prev_position.position + trade_volume;
	
	let prev_volume = prev_position.posiiton;
	avg_open = (prev_volume * prev_position.average_open + trade_volume * trade.price) / (prev_volume + trade_volume);
	cpnl = 0;
    } else {
	// Sell trade
	new_position = prev_position.position - trade_volume;
	avg_open = prev_position.average_open;
	cpnl = trade.volume * (trade.price - avg_open);
    }
    
    let position = {  trade_id: null, // set after function returns
	    position: new_position,
	    average_open: avg_open,
	    cash_pnl: cpnl };
    return position;
}


let main = async function(pair) {
    log("Starting Trade PnL...");
    
    // find the most recent trade
    let last_trade = await storage.get_last_trade();
    log("Last trade");
    log(last_trade);
    
    // fetch all trades since the last trade from the exchange
    let new_trades = await get_trades(last_trade ? last_trade.ext_id : 'T3KZB7-DGV5O-BJGN4C'); //TODO change to 'null' later
    
    // sort the trades, oldest first
    let sorted_trades = [];
    for (const [tx_id, trade] of Object.entries(new_trades)) {
        trade.ext_id = tx_id;
        // log(trade);
        sorted_trades.unshift(trade); // Add at beginning to reverse the order.
    }
    
    log("Fetched " + sorted_trades.length + " trades.");
    // store the new trades in the database, while checking that they are sorted
    let index, trade, prev_trade;
    for (index = 0; index < sorted_trades.length; index++) {
	prev_trade = trade;
	trade = sorted_trades[index];
	
	if (prev_trade && trade.time < prev_trade.time) {
	    console.error(`trade time: ${trade.time}  is before prev_trade time ${prev_trade.time}`);
	    throw "Trades are not in order!"
	}
	
	log(trade.type + ' ' + trade.price);
	let lastID = await storage.save_trade(trade);
	log(`Trade inserted with rowid ${lastID}`);
	
	// calculate position and pnl for the new trades
	// store those in the db
	let prev_position = await storage.get_last_position(trade.pair);
	let position = calculatePosition(trade, prev_position);
	position.trade_id = lastID;
	log('Saving position');
	log(position);
	
	let position_id = await storage.save_position(position);
	log(position_id + '\n');
	//console.log(`Position inserted with rowid ${position_id}`);
    }
    log("Saved all trades.\n");
    

    // output results. PnL for all new trades
    // if no new trades, then show the last 5.
    //
    // Fetch live spot and show live PnL

//    log("pair is " + pair);
//    get_rate(pair);
//    get_balance();
    
    let positions = storage.retrieve_positions();
    //console.log(trades);
    storage.close();
}


main(parser.pair);
//if ( typeof parser.pair !== 'undefined' && parser.pair ) {
//    main(parser.pair);
//} else { // if program was called with no arguments, show help.
//    parser.help();
//}
