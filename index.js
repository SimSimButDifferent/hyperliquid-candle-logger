const { Hyperliquid } = require("hyperliquid");
const fs = require("fs");
const path = require("path");

const symbol = "BTC-PERP";
const interval = "1m";
const count = 5000;

async function getHistoricalCandles(symbol, interval, count) {
  const sdk = new Hyperliquid({
    enableWs: false,
    testnet: false,
  });

  try {
    await sdk.connect();

    const intervalToMs = {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    };

    const intervalMs = intervalToMs[interval];
    if (!intervalMs) {
      throw new Error(`Unsupported interval: ${interval}`);
    }

    const endTime = Date.now();
    const startTime = endTime - (count || 5000) * intervalMs;

    // Add validation and logging
    if (startTime >= endTime) {
      console.error("Invalid time range:", {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      throw new Error("Start time must be before end time");
    }

    console.log("Fetching candles with params:", {
      symbol,
      interval,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    });

    const candles = await sdk.info.getCandleSnapshot(
      symbol,
      interval,
      startTime,
      endTime,
      true
    );

    return candles;
  } finally {
    sdk.disconnect();
  }
}

async function loadOrCreateDataFile(symbol, interval) {
  const dataDir = "./data";
  const filePath = path.join(dataDir, `${symbol}-${interval}.json`);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create or load file
  if (!fs.existsSync(filePath)) {
    const initialCandles = await getHistoricalCandles(symbol, interval);
    fs.writeFileSync(filePath, JSON.stringify(initialCandles, null, 2));
    return initialCandles;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function fillMissingCandles(symbol, interval, candleData) {
  if (candleData.length === 0) return [];

  const lastCandle = candleData[candleData.length - 1];
  const now = Date.now();
  const lastCandleTime = lastCandle.t; // Using 't' as that's the timestamp field in the data

  if (!lastCandleTime || isNaN(lastCandleTime)) {
    console.error("Invalid timestamp in last candle:", lastCandle);
    return candleData;
  }

  // Add check for future timestamps
  if (lastCandleTime > now) {
    console.error("Found future timestamp in data:", {
      lastCandleTime: new Date(lastCandleTime).toISOString(),
      currentTime: new Date(now).toISOString(),
    });
    // Remove the invalid future candle
    candleData.pop();
    return candleData;
  }

  const intervalToMs = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervalToMs[interval];
  if (now - lastCandleTime < intervalMs) return candleData;

  console.log(
    `Detected gap in data from ${new Date(lastCandleTime).toISOString()} to now`
  );
  console.log("Fetching missing candles...");

  // Get missing candles
  const missingCandles = await getHistoricalCandles(symbol, interval);

  // Create a map of existing candles by timestamp for faster lookup
  const existingCandleMap = new Map(
    candleData.map((candle) => [candle.t, candle])
  );

  // Merge new candles, avoiding duplicates
  for (const candle of missingCandles) {
    if (!existingCandleMap.has(candle.t)) {
      candleData.push(candle);
    }
  }

  // Sort by timestamp
  candleData.sort((a, b) => a.t - b.t);

  // Write updated data to file
  const dataDir = "./data";
  const filePath = path.join(dataDir, `${symbol}-${interval}.json`);
  fs.writeFileSync(filePath, JSON.stringify(candleData, null, 2));

  console.log(
    `Added ${missingCandles.length - existingCandleMap.size} missing candles`
  );
  return candleData;
}

async function candleLogger(symbol, interval) {
  const sdk = new Hyperliquid({ enableWs: true, testnet: false });
  let candleData = await loadOrCreateDataFile(symbol, interval);

  // Fill any missing candles before starting the live updates
  candleData = await fillMissingCandles(symbol, interval, candleData);

  // Save the updated data with filled candles
  const filePath = path.join("./data", `${symbol}-${interval}.json`);
  fs.writeFileSync(filePath, JSON.stringify(candleData, null, 2));

  try {
    await sdk.connect();
    console.log("Connected to WebSocket");

    let lastCandleTimestamp = 0;
    let lastProcessedData = null;
    const MINUTE_MS = 60 * 1000;
    const BUFFER_MS = 100;

    // Function to save data to file
    const saveToFile = () => {
      const filePath = path.join("./data", `${symbol}-${interval}.json`);
      fs.writeFileSync(filePath, JSON.stringify(candleData, null, 2));
    };

    sdk.subscriptions.subscribeToCandle(symbol, interval, (data) => {
      const currentTimestamp = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;

      if (currentTimestamp > lastCandleTimestamp) {
        lastProcessedData = data;

        setTimeout(() => {
          console.log(
            "Candle closed at:",
            new Date(currentTimestamp).toISOString()
          );
          console.log("Final closing candle data:", lastProcessedData);

          // Add new candle to dataset if it doesn't exist
          const candleExists = candleData.some(
            (candle) => candle.timestamp === lastProcessedData.timestamp
          );

          if (!candleExists) {
            candleData.push(lastProcessedData);
            // Sort candles by timestamp to maintain order
            candleData.sort((a, b) => a.timestamp - b.timestamp);
            saveToFile();
            console.log("New candle added to dataset");
          }

          lastCandleTimestamp = currentTimestamp;
        }, BUFFER_MS);
      }
    });

    // Keep the script running
    await new Promise(() => {});
  } catch (error) {
    console.error("Error:", error);
  }
}

async function main() {
  try {
    let candleData = await loadOrCreateDataFile(symbol, interval);
    candleData = await fillMissingCandles(symbol, interval, candleData);

    // Log the data state
    console.log(`Current data has ${candleData.length} candles`);
    console.log(
      `Latest candle timestamp: ${new Date(
        candleData[candleData.length - 1].t
      ).toISOString()}`
    );

    candleLogger(symbol, interval);
    setInterval();
  } catch (error) {
    console.error("Error in main:", error);
  }
}

// Start the candle logger
main()
  .then(() => {
    console.log("Candle logger running");
  })
  .catch((error) => {
    console.error("Error:", error);
  });
// Start the candle logger
// candleLogger(symbol, interval)
//   .then(() => {
//     console.log("Candle logger running");
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });
