/**
 * Test Tool API - For Copilot & Automation Integration
 * Exposes test tools as JSON API
 * 
 * Usage:
 *   node api.js --action=list [backend]
 *   node api.js --action=analyze --file=path.csv --tool=reconciliation [backend]
 *   node api.js --action=validate --checks=auth,rate-limit [backend]
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { tools } = require("./src/cli/tools");

// Normalize tool names for CLI
const toolMap = {
  DATA: {
    reconciliation: require("./src/checks/data/reconciliation/run"),
    profitValidation: require("./src/checks/data/profitValidation/run"),
    buyableButNotActive: require("./src/checks/data/buyableButNotActive/run"),
    orderAudit: require("./src/checks/data/orderAudit/run"),
    productAudit: require("./src/checks/data/productAudit/run"),
  },
  SECURITY: {
    inputValidation: require("./src/checks/security/inputValidation"),
    authzIsolation: require("./src/checks/security/authzIsolation"),
    errorLeakage: require("./src/checks/security/errorLeakage"),
    rateLimit: require("./src/checks/security/rateLimit"),
    performance: require("./src/checks/security/performance"),
  },
};

// Output formatter
function outputJSON(status, data, message = "") {
  const output = {
    status,
    timestamp: new Date().toISOString(),
    message,
    data,
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(status === "success" ? 0 : 1);
}

// Parse CLI arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, value] = arg.split("=");
    args[key.replace(/^--/, "")] = value || true;
  });
  return args;
}

// List available tools
function listTools() {
  const toolsList = tools.map((tool) => ({
    section: tool.section,
    name: tool.name,
    description: tool.description,
    input: tool.input,
    output: tool.output,
  }));

  outputJSON("success", { tools: toolsList }, "Available test tools");
}

// Validate environment
async function validateEnvironment() {
  const checks = {
    env_file: fs.existsSync(".env"),
    backend_account: !!process.env.BACKEND_ACCOUNT,
    api_key: !!process.env.API_KEY,
    credentials: !!process.env.AWS_CREDENTIALS,
  };

  const allValid = Object.values(checks).every((v) => v);

  outputJSON(
    allValid ? "success" : "error",
    checks,
    allValid ? "Environment OK" : "Missing environment variables"
  );
}

// Run a specific tool
async function runTool(args) {
  const { tool: toolName, file: filePath } = args;

  if (!toolName) {
    outputJSON("error", null, "Missing --tool parameter. Use --action=list");
    return;
  }

  // Find the tool
  const toolConfig = tools.find(
    (t) => t.name.toLowerCase().replace(/\s+/g, "") === toolName.toLowerCase()
  );

  if (!toolConfig) {
    outputJSON(
      "error",
      { availableTools: tools.map((t) => t.name) },
      `Tool not found: ${toolName}`
    );
    return;
  }

  try {
    console.error(`🚀 Running tool: ${toolConfig.name}`);
    console.error(`📁 File: ${filePath}`);

    // Run the tool (simplified - actual implementation depends on tool type)
    console.error("⚠️ Note: Full tool execution requires interactive setup");

    outputJSON("warning", {
      tool: toolConfig.name,
      file: filePath,
      status: "requires_interactive",
    }, "Use 'npm start' for full interactive mode");
  } catch (error) {
    outputJSON("error", { error: error.message }, error.message);
  }
}

// Main
async function main() {
  const args = parseArgs();
  const action = args.action || "list";

  try {
    switch (action) {
      case "list":
        listTools();
        break;

      case "validate":
        await validateEnvironment();
        break;

      case "run":
        await runTool(args);
        break;

      default:
        outputJSON("error", null, `Unknown action: ${action}`);
    }
  } catch (error) {
    outputJSON("error", { error: error.message }, error.message);
  }
}

main();

// Exports for programmatic use
module.exports = {
  toolMap,
  listTools,
  validateEnvironment,
  runTool,
};
