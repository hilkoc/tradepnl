'use strict';

/** All interactions with the exchange are handled through here.
 *  This implementation connects to Kraken. 
 */

const KrakenClient = require('kraken-api');
//const async_module = require('async'); // Needed for async functions

class Exchange {
    /** Manages the connection with the exchange */
    
    constructor(key, secret) {
        this.kraken = new KrakenClient(key, secret);
    }

    on_error(err) {
        if (err) {
            console.error(err.message);
        }
    }
    
    /** Display user's balance */
    get_balance() {
        return new Promise( (resolve, reject) => {
            this.kraken.api('Balance', function callback(err, result) {
            if (err) {
                this.on_error(err);
                reject(err);
            }
            resolve(result.result);
            });
        });
    }

    /** 
     * @param {String}  since can be a timestamp or a tx_id.
     * @return {Object} map of trades. Keys of the map are the external ids (tx_id);
     * Trade_ids in Kraken are referred to as tx_id, in this app as ext_id.
     * The values of the map are Trade objects. The map is ordered chronologically, most recent trade first.
     * */
    get_trades(since, offset) {
        let params = {type: 'no position'}; // Only fetch trades that are not margin trades.
        if (since || since === 0) {
            params.start = since;
        }
        if (offset) {
            params.ofs = offset;
        }
        return new Promise( (resolve, reject) => {
            this.kraken.api('TradesHistory', params, function callback(err, result) {
                if (err) {
                    console.error(err);
                    resolve([]); // Return an empty list
                    return;
                }
                let trades = result.result.trades;
                resolve(trades);
            });
        });
    }

    /** 
     * Public method. Returns the spot rate for given currency pair.
     * Note on Kraken BTCUSD is 'XXBTZUSD'
     * @param ccypair the currency pair to retrieve the spot rate for.
     * @return Returns the last traded price for the given pair.
     */
    get_rate(ccypair) {
        return new Promise( (resolve, reject) => {
            try {
                this.kraken.api('Ticker', { pair : ccypair } , function callback(err, results) {

                    if (err) {
                        console.error(err.message);
                        reject(err);
                    }
                    const ticker = results.result[ccypair];
                    const last_trade_arr = ticker.c;
                    resolve( parseFloat(last_trade_arr[0]) );
                } );
            } catch(e) {
                console.log("Error in get_rate for pair " + ccypair);
                this.on_error(e);
                reject(e);
            }
        });
    }
}

module.exports.makeExchange = function () {
    /*
     * Before starting, run:  source api_keys.sh
     * where api_keys.sh is a file containing;
     * * export API_KEY=<api key here>
     * * export API_SECRET=<api secret key here>
     */
    const key          = process.env.API_KEY;
    const secret       = process.env.API_SECRET;
    if (!key || !secret) {
        console.warn("No API keys found! Only public API methods can be used.");
        console.warn("    Run:\n    export API_KEY=<api key here>\n    export API_SECRET=<api secret key here>");
    }
    let exchange = new Exchange(key, secret);
    return exchange;
}

