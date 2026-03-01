require("dotenv").config();

const { initAuth } = require("./auth");
const {
  createRunFolder,
  writeJson,
  writeMarkdown,
  deleteAllReports,
} = require("./report/reporter");

const { createCLI } = require("./cli/menu");

// tools
const performance = require("./checks/performance");
const reconciliation = require("./checks/reconciliation/run");
const profitValidation = require("./checks/profitValidation/run");

// security
const inputValidation = require("./checks/inputValidation");
const authzIsolation = require("./checks/authzIsolation");
const errorLeakage = require("./checks/errorLeakage");
const rateLimit = require("./checks/rateLimit");

const tools = [
  { name: "API Performance Analyzer", run: performance.run },
  { name: "Data Reconciliation", run: reconciliation.run },
  { name: "Profit Calculation Validation", run: profitValidation.run },

  { name: "Input Validation", run: inputValidation.run },
  { name: "AuthZ Isolation", run: authzIsolation.run },
  { name: "Error Leakage", run: errorLeakage.run },
  { name: "Rate Limit", run: rateLimit.run },

  {
    name: "Run All Security Tests",
    run: async () => [
      ...(await inputValidation.run()),
      ...(await authzIsolation.run()),
      ...(await errorLeakage.run()),
      ...(await rateLimit.run()),
    ],
  },

  { name: "Clear All Reports", type: "danger" },
];

// CLI oluştur
const cli = createCLI({
  tools,

  onSelect: async (selected, showMenu) => {
    // 🔥 delete special case
    if (selected.type === "danger") {
      return cli.confirm("This will DELETE ALL REPORTS!", (confirmed) => {
        if (confirmed) {
          deleteAllReports();
          console.log("🗑️ Deleted!");
        } else {
          console.log("❎ Cancelled");
        }

        setTimeout(showMenu, 1000);
      });
    }

    try {
      console.log(`\n🚀 Running: ${selected.name}\n`);

      await initAuth();

      const result = await selected.run?.(cli);

      const toolName = selected.name.toLowerCase().replace(/[^\w]+/g, "_");
      const dir = createRunFolder(toolName);

      if (result) {
        writeJson(dir, "results.json", result);
        writeMarkdown(dir, "report.md", result, selected.name);
      }

      console.log(`\n📁 Saved to: ${dir}`);
    } catch (e) {
      console.log("❌ ERROR:", e.message);
    }

    cli.waitReturn();
  },

  onExit: () => process.exit(0),
});

// start
cli.start();
