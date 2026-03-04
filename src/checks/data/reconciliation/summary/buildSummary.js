const { computeCounters } = require("./counters");
const { computeCoverage } = require("./coverage");
const { computeSeverity } = require("./severity");
const { computeSystemHealth } = require("./health");
const { computeStats } = require("./stats");
const { findWorst } = require("./worst");
const { buildMarkdown } = require("./report");

function buildSummary(results, metrics = {}) {
  const summary = {
    type: "SUMMARY",

    total: results.length,

    match: 0,
    priceMismatch: 0,
    stockMismatch: 0,
    bothMismatch: 0,
    missingInAmazon: 0,
    missingInSyncro: 0,

    syncroTotal: metrics.syncroTotal || 0,
    amazonTotal: metrics.amazonTotal || 0,
    syncroMatchedInAmazon: metrics.syncroMatchedInAmazon || 0,
    coverageRate: metrics.coverageRate || "0%",

    _priceSeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    _stockSeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  computeCounters(results, summary);
  computeSeverity(results, summary);

  computeCoverage(summary, metrics); // 🔥 EKLE

  computeStats(summary);

  computeSystemHealth(results, summary);

  const worst = findWorst(results);

  summary.prettyReport = buildMarkdown(summary, worst);

  return summary;
}
module.exports = { buildSummary };
