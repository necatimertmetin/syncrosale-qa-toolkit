const fs = require("fs");
const { audit } = require("./orderAudit");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("📂 Enter CSV path: ", (filePath) => {
      try {
        if (!fs.existsSync(filePath)) {
          console.log("❌ File not found");
          return resolve([]);
        }

        const csv = fs.readFileSync(filePath, "utf8");

        const result = audit(csv);

        console.log("\n📊 ORDER AUDIT DONE");

        resolve(result);
      } catch (e) {
        console.log("❌ ERROR:", e.message);
        resolve([]);
      }
    });
  });
}

module.exports = { run };
