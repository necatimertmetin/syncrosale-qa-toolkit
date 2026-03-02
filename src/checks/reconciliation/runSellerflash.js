const fs = require("fs");
const path = require("path");

const { buildSummary } = require("./summary");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("🔍 Source type (syncro / sellerflash): ", (sourceType) => {
      if (!sourceType) {
        console.log("❌ Source type required");
        return resolve(null);
      }

      const source = sourceType.trim().toLowerCase();

      if (!["syncro", "sellerflash"].includes(source)) {
        console.log("❌ Invalid source (syncro / sellerflash)");
        return resolve(null);
      }

      cli.ask("📄 Amazon TXT path: ", (amazonPath) => {
        if (!amazonPath) {
          console.log("❌ Amazon path required");
          return resolve(null);
        }

        cli.ask(`📦 ${source.toUpperCase()} CSV path: `, (sourcePath) => {
          if (!sourcePath) {
            console.log("❌ CSV path required");
            return resolve(null);
          }

          try {
            const amazonFullPath = path.resolve(amazonPath.trim());
            const sourceFullPath = path.resolve(sourcePath.trim());

            const amazonTxt = fs.readFileSync(amazonFullPath, "utf-8");
            const sourceCsv = fs.readFileSync(sourceFullPath, "utf-8");

            // 🔥 dynamic import
            let reconcile;
            let mapToReportFormat;

            if (source === "syncro") {
              ({ reconcile } = require("./reconciliation"));
              ({ mapToReportFormat } = require("./mapper"));
            } else if (source === "sellerflash") {
              ({ reconcile } = require("./reconciliationSellerflash"));
              ({ mapToReportFormat } = require("./mapperSellerflash"));
            }

            // 🔥 CORE
            const rawResults = reconcile(sourceCsv, amazonTxt);

            console.log("\n✅ Reconciliation completed");
            console.log(`🔢 Total records: ${rawResults.length}`);
            console.log(`📦 Source: ${source.toUpperCase()}`);

            // 🔥 SUMMARY
            const summary = buildSummary(rawResults);
            console.log("\n📊 SUMMARY");
            console.table(summary);

            // 🔥 MAPPING
            const mapped = mapToReportFormat(rawResults);

            const finalReport = [summary, ...mapped];

            resolve(finalReport);
          } catch (err) {
            console.log("❌ File error:", err.message);
            resolve(null);
          }
        });
      });
    });
  });
}

module.exports = { run };
