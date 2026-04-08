const { runPriceIntegrity } = require("./core/priceIntegrity");
const { runSupplierCrossCheck } = require("./core/supplierCrossCheck");
const { runStatusAnomalies } = require("./core/statusAnomalies");
const { runCompetitiveCheck } = require("./core/competitiveCheck");
const { runDataFreshness } = require("./core/dataFreshness");
const { runDesiValidation } = require("./core/desiValidation");
const { buildSummary } = require("./summary/buildSummary");

function analyzeProduct(detail) {
  return [
    ...runPriceIntegrity(detail),
    ...runSupplierCrossCheck(detail),
    ...runStatusAnomalies(detail),
    ...runCompetitiveCheck(detail),
    ...runDataFreshness(detail),
    ...runDesiValidation(detail),
  ];
}

function audit(products) {
  const allResults = [];
  const perProduct = [];

  for (const detail of products) {
    if (!detail) continue;

    const issues = analyzeProduct(detail);
    allResults.push(...issues);

    if (issues.length > 0) {
      perProduct.push({
        asin: detail.asin,
        issueCount: issues.length,
        critical: issues.filter((i) => i.severity === "CRITICAL").length,
        high: issues.filter((i) => i.severity === "HIGH").length,
        medium: issues.filter((i) => i.severity === "MEDIUM").length,
      });
    }
  }

  const summary = buildSummary(products, allResults, perProduct);

  return [summary, ...allResults];
}

module.exports = { audit, analyzeProduct };
