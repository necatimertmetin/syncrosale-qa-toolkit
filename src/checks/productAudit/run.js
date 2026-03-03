const fs = require("fs");
const { audit } = require("./productAudit");
const { render } = require("./renderer");

async function run(cli) {
  return new Promise((resolve) => {
    cli.ask("📂 Enter Product CSV path: ", (filePath) => {
      try {
        if (!fs.existsSync(filePath)) {
          console.log("❌ File not found");
          return resolve([]);
        }

        const csv = fs.readFileSync(filePath, "utf8");
        const result = audit(csv);

        console.log("\n📊 PRODUCT AUDIT DONE");

        // 👇 renderer'ı result içine attach ediyoruz
        result.__renderer = render;

        resolve(result);
      } catch (e) {
        console.log("❌ ERROR:", e.message);
        resolve([]);
      }
    });
  });
}

module.exports = { run };
