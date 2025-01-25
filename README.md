# Hyperliquid Candle Logger

A Node.js application that logs real-time and historical candlestick data from Hyperliquid exchange. The logger maintains historical price data and continuously updates with new candles as they close.

## Features

- Fetches historical candlestick data from Hyperliquid
- Real-time websocket connection for live price updates
- Automatically fills missing candles when restarted
- Saves data to JSON files organized by symbol and timeframe
- Supports multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- Handles connection errors and data validation

## Installation

```bash
npm install
```

## Usage

```bash
node index.js
```

The application will:

1. Load or create data files for each configured symbol/timeframe
2. Fill any missing historical data
3. Connect to websocket for real-time updates
4. Save new candles as they close

Data is saved to the `./data` directory in JSON format with filenames like `BTC-PERP-1m.json`.

## Configuration

The following constants can be modified in `index.js`:

```javascript
// Symbols
const BTC_PERP = "BTC-PERP";
const ETH_PERP = "ETH-PERP";
// etc...

// Intervals
const oneMinute = "1m";
const fiveMinutes = "5m";
// etc...
```

## Dependencies

- hyperliquid-js-sdk
- fs
- path

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
