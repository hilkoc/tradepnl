'use strict';

/* Test case for the storage module */

//let tradestorage = require('./storage');

function test_init_database() {
    let storage = require('./storage').makeStorage();
    
    let trade = { ordertxid: 'OGY2WA-UQ46X-RXO3N3',
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

    
    storage.save_trade(trade);
    
    let trades = storage.retrieve_positions();
    console.log(trades);
    storage.close();
}


function test_read_envs() {
    let api_key = process.env.API_KEY
    console.log(api_key);
}

//test_init_database();
test_read_envs();
