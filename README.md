# Trade PnL
Command line tool to fetch full trade history from Kraken and analyze past trades, current positions and profit and loss.


## Features

+ Retrieve complete trade history and store in a sqlite database
+ Retrieve the current live price for each position
+ Per traded currency per calculate
  - average opening price
  - cumulative position
  - cumulative Profit and Loss, absolue and as percentage
+ Calculate fees and cash PnL per trade


## Requirements

+ An account on Kraken and API keys with permission to fetch trade history
+ A recent version of nodejs

## Installation
 + Install [nodejs](https://nodejs.org)
 + Clone this repository and then run:
    ```bash
    npm install --only=production
    ```

The sqlite database will be created and initialized upon the first run.
Before running the app, first the API keys need to be set in environment variables.
Create a file `api_keys.sh` in a safe place. It does not need to be in the same directory.
Put these lines in it, and edit them to match your API keys.

```bash
export API_KEY=<api key here>
export API_SECRET=<api secret key here>
```

Save the file, make it executable and then run:
 ```bash
 source api_keys.sh
 ```

Finally, run the tradepnl application with:
 ```bash
 node main.js
 ```
 
 ## Planned improvements
 + Better support for trading overlapping currency pairs
 + Support for margin trades and short positions
 + Support for more exchanges
 + GUI
 
 Contributers and constructive feedback are welcome.
