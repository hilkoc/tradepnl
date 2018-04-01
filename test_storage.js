'use strict';

/* Test case for the storage module */


async function test_init_database() {
    let storage = require('./storage').makeStorage('test_trades.db');
    
    let trade = { ordertxid: 'OGY2WA-UQ46X-RXO3N4',
              postxid: 'TKH2SE-M7IF5-CFI7LT',
              pair: 'XETHZUSD',
              time: 1522320522.7156,
              type: 'sell',
              ordertype: 'limit',
              price: '409.90000',
              cost: '529.08600',
              fee: '0.84654',
              vol: '1.29076848',
              margin: '0.00000',
              misc: '' }

    
    let rowID = await storage.save_trade(trade);
    
    let position = {  trade_id: rowID, position: 2, average_open: 300, cash_pnl: 1.2907 };
    rowID = await storage.save_position(position);
    
    let trades = storage.retrieve_positions();
    //console.log(trades);
    storage.close();
}

async function test_get_last_trade() {
    let storage = require('./storage').makeStorage();
    
    let trade = await storage.get_last_trade();
    console.log(trade);
    
    
    let pair = 'XETHZUSD';
    console.log("Again for pair " + pair);
    trade = await storage.get_last_trade(pair);
    console.log(trade);
    
    storage.close();
}

//test_init_database();
test_get_last_trade();