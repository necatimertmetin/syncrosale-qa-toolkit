const fs = require("fs");
const path = require("path");

const { findBuyableButNotActive } = require("./buyableButNotActive");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("📂 CSV file path: ", (inputPath) => {
      if (!inputPath) {
        console.log("❌ Path boş olamaz");
        return resolve([]);
      }

      try {
        const fullPath = path.resolve(inputPath);
        const raw = fs.readFileSync(fullPath, "utf-8");

        const anomalies = findBuyableButNotActive(raw);

        console.log("\n🚨 BUYABLE BUT NOT ACTIVE\n");

        const preview = anomalies.slice(0, 50);

        console.table(
          preview.map((r) => ({
            asin: r.asin,
            storeStatus: r.status,
            amazonStatus: r.amazonStatus,
            price: r.price,
            quantity: r.quantity,
          })),
        );

        if (anomalies.length > 50) {
          console.log(`... showing 50/${anomalies.length}`);
        }

        const results = anomalies.map((r) => ({
          asin: r.asin,
          storeStatus: r.status,
          amazonStatus: r.amazonStatus,
        }));

        const summary = {
          type: "SUMMARY",
          total: anomalies.length,
        };

        resolve([summary, ...results]);
      } catch (e) {
        console.log("❌ ERROR:", e.message);
        resolve([]);
      }
    });
  });
}

module.exports = { run };
