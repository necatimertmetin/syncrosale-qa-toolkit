const reconciliation = require("../checks/data/reconciliation/run");
const profitValidation = require("../checks/data/profitValidation/run");
const buyableButNotActive = require("../checks/data/buyableButNotActive/run");
const orderAudit = require("../checks/data/orderAudit/run");
const productAudit = require("../checks/data/productAudit/run");
const productAuditAdvanced = require("../checks/data/productAudit/runFiltered");
const v2EntityValidation = require("../checks/data/v2-entity-validation/run");
// security
const inputValidation = require("../checks/security/inputValidation");
const authzIsolation = require("../checks/security/authzIsolation");
const errorLeakage = require("../checks/security/errorLeakage");
const rateLimit = require("../checks/security/rateLimit");
const performance = require("../checks/security/performance");

const tools = [
  {
    section: "DATA",
    name: "V2 Entity Validation (SYNC-9999)",
    description: "Detects all bugs in V2 entities directly from database - backend independent",
    input: "None (reads from DB)",
    output: "Comprehensive validation report + data corruption detection",
    impact: "CRITICAL",
    tags: ["v2-entities", "validation", "database", "sync-9999"],
    run: v2EntityValidation,
  },

  {
    section: "DATA",
    name: "Data Reconciliation",
    description: "Compares Syncro CSV and Amazon TXT data...",
    input: "Amazon TXT + Syncro CSV",
    output: "Mismatch report + summary",
    impact: "HIGH",
    tags: ["catalog", "sync"],
    run: reconciliation.run,
  },
  {
    section: "DATA",
    name: "Product Audit (Advanced)",
    description: "Interactive multi-preset product audit",
    input: "None",
    output: "Insights + comparisons",
    impact: "HIGH",
    tags: ["catalog", "margin", "pricing"],
    run: productAuditAdvanced.run,
  },
  {
    section: "DATA",
    name: "Buyable but Not Active",
    description: "Detects listing inconsistency",
    input: "Syncro CSV",
    output: "ASIN list",
    impact: "MEDIUM",
    tags: ["catalog", "listing"],
    run: buyableButNotActive.run,
  },

  {
    section: "DATA",
    name: "Product Audit",
    description: "Analyzes product pricing, margin and category performance",
    input: "",
    output: "Insights + breakdowns",
    impact: "HIGH",
    tags: ["catalog", "margin", "pricing"],
    run: productAudit.run,
  },

  {
    section: "DATA",
    name: "Profit Calculation Validation",
    description: "Validates backend profit...",
    input: "Order ID",
    output: "Profit diff + breakdown",
    impact: "HIGH",
    tags: ["finance", "margin"],
    run: profitValidation.run,
  },

  {
    section: "DATA",
    name: "Order Audit",
    description: "Runs anomaly checks on order CSV",
    input: "",
    output: "Anomaly report + breakdown",
    impact: "HIGH",
    tags: ["finance", "orders", "integrity"],
    run: orderAudit.run,
  },

  {
    section: "SECURITY",
    name: "API Performance Analyzer",
    description:
      "Measures API response time, payload size and status codes for critical endpoints",
    input: "No input required",
    output: "Response time, status code, payload size per endpoint",
    impact: "MEDIUM",
    tags: ["performance", "latency"],
    run: performance.run,
  },

  {
    section: "SECURITY",
    name: "Input Validation",
    description: "Tests malformed inputs",
    input: "None",
    output: "Status + classification",
    impact: "LOW",
    tags: ["validation"],
    run: inputValidation.run,
  },

  {
    section: "SECURITY",
    name: "AuthZ Isolation",
    description: "Cross-store access control test",
    input: "Store IDs",
    output: "403/404 validation",
    impact: "HIGH",
    tags: ["access", "isolation"],
    run: authzIsolation.run,
  },

  {
    section: "SECURITY",
    name: "Error Leakage",
    description: "Detects stacktrace leaks",
    input: "None",
    output: "Leak detection",
    impact: "HIGH",
    tags: ["debug", "errors"],
    run: errorLeakage.run,
  },

  {
    section: "SECURITY",
    name: "Rate Limit",
    description: "Stress test for rate limiting",
    input: "None",
    output: "429 detection",
    impact: "MEDIUM",
    tags: ["traffic", "throttle"],
    run: rateLimit.run,
  },

  {
    section: "SECURITY",
    name: "Run All Security Tests",
    description: "Runs all security checks",
    input: "None",
    output: "Combined results",
    impact: "HIGH",
    tags: ["security"],
    run: async () => [
      ...(await inputValidation.run()),
      ...(await authzIsolation.run()),
      ...(await errorLeakage.run()),
      ...(await rateLimit.run()),
    ],
  },

  {
    section: "SYSTEM",
    name: "Change Account",
    description: "Switch API credentials",
    input: "None",
    output: "Active account changed",
    impact: "LOW",
    tags: ["config"],
    type: "account",
  },

  {
    section: "SYSTEM",
    name: "Clear All Reports",
    description: "Deletes all generated reports",
    input: "Confirmation",
    output: "All reports removed",
    impact: "DANGER",
    tags: ["cleanup"],
    type: "danger",
  },
];

module.exports = { tools };
