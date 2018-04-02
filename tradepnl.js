'use strict';

/** trade pnl app */
class App {
    
    constructor(exchange, storage) {
        this.exchange = exchange;
        this.storage = storage;
    }
    
    close(){
        this.storage.close();
    }
    

    /** See https://github.com/askmike/gekko/issues/2028 */
    calculatePosition(trade, prev_position) {
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
        avg_open = prev_position.average_open || trade.price;
        cpnl = trade_volume * (trade.price - avg_open);
        }

        let position = {  trade_id: null, // set after function returns
            position: new_position,
            average_open: avg_open,
            cash_pnl: cpnl };
        return position;
    }


    async fetch_new_trades() {
        // find the most recent trade
        let last_trade = await this.storage.get_last_trade();
        
        // Fetch all trades since the last trade from the exchange
        let new_trades = await this.exchange.get_trades(last_trade ? last_trade.ext_id : -1);
        // Sort the trades, oldest first. Important: Also convert strings to
        // floats.
        let sorted_trades = [];
        for (const [tx_id, trade] of Object.entries(new_trades)) {
            trade.ext_id = tx_id;
            trade.vol = parseFloat(trade.vol);
            trade.price = parseFloat(trade.price);
            trade.fee = parseFloat(trade.fee);
            sorted_trades.unshift(trade); // Add at beginning to reverse the order.
        }
        
        const nr_new_trades = sorted_trades.length;
        // Store the new trades in the database, while checking that they are
        // sorted
        let index, trade, prev_trade;
        for (index = 0; index < sorted_trades.length; index++) {
        prev_trade = trade;
        trade = sorted_trades[index];
        
        if (prev_trade && trade.time < prev_trade.time) {
            console.error(`trade time: ${trade.time}  is before prev_trade time ${prev_trade.time}`);
            throw "Trades are not in order!"
        }
        
        //log(trade.type + ' ' + trade.vol + '  at ' + trade.price);
        let lastID = await this.storage.save_trade(trade);
        
        // Calculate position and pnl for the new trades
        // Store those in the db
        let prev_position = await this.storage.get_last_position(trade.pair);
        let position = this.calculatePosition(trade, prev_position);
        position.trade_id = lastID;
        
        let position_id = await this.storage.save_position(position);
        }
        //log("Saved all trades.\n");
        return nr_new_trades;
    }

    
    async process_trade_pnl(nr_rows, row_callback) {
        await this.storage.retrieve_positions(nr_rows, row_callback);
    }
    
    
    async process_live_pnl(get_live_pnl) {
        let rows = await this.storage.get_all_positions();
        rows.forEach(get_live_pnl);
    }
    
}

module.exports = App;