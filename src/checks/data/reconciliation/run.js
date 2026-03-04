const fs = require("fs");
const path = require("path");

const { reconcile } = require("./reconciliation");
const { mapToReportFormat } = require("./mapper");
const { buildSummary } = require("./summary/buildSummary");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("📄 Amazon TXT path: ", (amazonPath) => {
      if (!amazonPath) {
        console.log("❌ Amazon path required");
        return resolve(null);
      }

      cli.ask("📦 Syncro CSV path: ", (syncroPath) => {
        if (!syncroPath) {
          console.log("❌ Syncro path required");
          return resolve(null);
        }

        try {
          const amazonFullPath = path.resolve(amazonPath.trim());
          const syncroFullPath = path.resolve(syncroPath.trim());

          const amazonTxt = fs.readFileSync(amazonFullPath, "utf-8");
          const syncroCsv = fs.readFileSync(syncroFullPath, "utf-8");

          // 🔥 CORE
          const { results: rawResults, metrics } = reconcile(
            syncroCsv,
            amazonTxt,
          );

          console.log("\n✅ Reconciliation completed");
          console.log(`🔢 Total records: ${rawResults.length}`);

          // 🔥 SUMMARY
          const summary = buildSummary(rawResults, metrics);
          console.log("\n📊 SUMMARY");
          console.table(summary);

          // 🔥 MAPPING
          const mapped = mapToReportFormat(rawResults);

          // 🔥 FINAL OUTPUT (reporter-friendly)
          const finalReport = [summary, ...mapped];

          resolve(finalReport);
        } catch (err) {
          console.log("❌ File error:", err.message);
          resolve(null);
        }
      });
    });
  });
}
module.exports = {
  run,
};
