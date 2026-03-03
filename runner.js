require("dotenv").config();

const { initAuth } = require("./src/auth");
const {
  createRunFolder,
  writeJson,
  writeMarkdown,
  deleteAllReports,
  writeCSV,
} = require("./src/report/reporter");

const { createCLI } = require("./src/cli/menu");

// tools
const performance = require("./src/checks/performance");
const reconciliation = require("./src/checks/reconciliation/run");
const profitValidation = require("./src/checks/profitValidation/run");
const buyableButNotActive = require("./src/checks/buyableButNotActive/run");
const orderAudit = require("./src/checks/orderAudit/run");
// security
const inputValidation = require("./src/checks/inputValidation");
const authzIsolation = require("./src/checks/authzIsolation");
const errorLeakage = require("./src/checks/errorLeakage");
const rateLimit = require("./src/checks/rateLimit");

const tools = [
  {
    section: "DATA",
    name: "API Performance Analyzer",
    description:
      "Measures API response time, payload size and status codes for critical endpoints",
    input: "No input required",
    output: "Response time, status code, payload size per endpoint",
    impact: "MEDIUM",
    run: performance.run,
  },

  {
    section: "DATA",
    name: "Data Reconciliation",
    description: "Compares Syncro CSV and Amazon TXT data...",
    input: "Amazon TXT + Syncro CSV",
    output: "Mismatch report + summary",
    impact: "HIGH",
    run: reconciliation.run,
  },

  {
    section: "DATA",
    name: "Profit Calculation Validation",
    description: "Validates backend profit...",
    input: "Order ID",
    output: "Profit diff + breakdown",
    impact: "HIGH",
    run: profitValidation.run,
  },

  {
    section: "DATA",
    name: "Buyable but Not Active",
    description: "Detects listing inconsistency",
    input: "Syncro CSV",
    output: "ASIN list",
    impact: "MEDIUM",
    run: buyableButNotActive.run,
  },
  {
    section: "DATA",
    name: "Order Audit",
    description: "Runs anomaly checks on order CSV",
    input: "CSV file path",
    output: "Anomaly report + breakdown",
    impact: "HIGH",
    run: orderAudit.run,
  },
  {
    section: "DATA",
    name: "Product Audit",
    description: "Analyzes product pricing, margin and category performance",
    input: "Product CSV",
    output: "Insights + breakdowns",
    impact: "HIGH",
    run: require("./src/checks/productAudit/run").run,
  },

  // 🔐 SECURITY
  {
    section: "SECURITY",
    name: "Input Validation",
    description: "Tests malformed inputs",
    input: "None",
    output: "Status + classification",
    impact: "LOW",
    run: inputValidation.run,
  },

  {
    section: "SECURITY",
    name: "AuthZ Isolation",
    description: "Cross-store access control test",
    input: "Store IDs",
    output: "403/404 validation",
    impact: "HIGH",
    run: authzIsolation.run,
  },

  {
    section: "SECURITY",
    name: "Error Leakage",
    description: "Detects stacktrace leaks",
    input: "None",
    output: "Leak detection",
    impact: "HIGH",
    run: errorLeakage.run,
  },

  {
    section: "SECURITY",
    name: "Rate Limit",
    description: "Stress test for rate limiting",
    input: "None",
    output: "429 detection",
    impact: "MEDIUM",
    run: rateLimit.run,
  },

  {
    section: "SECURITY",
    name: "Run All Security Tests",
    description: "Runs all security checks",
    input: "None",
    output: "Combined results",
    impact: "HIGH",
    run: async () => [
      ...(await inputValidation.run()),
      ...(await authzIsolation.run()),
      ...(await errorLeakage.run()),
      ...(await rateLimit.run()),
    ],
  },

  {
    section: "SYSTEM",
    name: "Clear All Reports",
    description: "Deletes all generated reports",
    input: "Confirmation",
    output: "All reports removed",
    impact: "DANGER",
    type: "danger",
  },
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

      let result = await selected.run?.(cli);
      const toolName = selected.name.toLowerCase().replace(/[^\w]+/g, "_");
      const dir = createRunFolder(toolName);

      if (result) {
        writeJson(dir, "results.json", result);
        writeMarkdown(dir, "report.md", result, selected.name);
        if (
          selected.name.includes("Reconciliation") ||
          selected.name.includes("Buyable") ||
          selected.name.includes("Order Audit") ||
          selected.name.includes("Product Audit")
        ) {
          await writeCSV(dir, "report.csv", result);
        }
      }
      result = null;
      console.log(`\n📁 Saved to: ${dir}`);
    } catch (e) {
      console.log("❌ ERROR:", e.message);
    }
    result = null;
    global.gc?.();
    cli.waitReturn();
  },

  onExit: () => process.exit(0),
});

// start
cli.start();
