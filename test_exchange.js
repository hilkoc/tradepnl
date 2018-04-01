'use strict';

/* Test case for the exchange module */

//const exchange_module =  require('./exchange');
const exchange = require('./exchange').makeExchange();

async function test_get_rate() {
//    let exchange = exchange_module.makeExchange();
    const btcusd = 'XXBTZUSD'
    let btc_price = await exchange.get_rate(btcusd);
    console.log(btc_price);

    let pair = 'XETHZUSD';
    console.log("Again for pair " + pair);
    let eth_price = await exchange.get_rate(pair);
    console.log(eth_price);
}


async function test_get_balance() {
    let balance = await exchange.get_balance();
    console.log(balance);
}

async function test_get_trades() {
    const since = 'T3KZB7-DGV5O-BJGN4C'
    let trades = await exchange.get_trades(since);
    console.log(trades);
}


function test_read_envs() {
    let api_key = process.env.API_KEY
    console.log(api_key);
}

//test_read_envs();
//test_get_balance();
test_get_trades();
//test_get_rate();