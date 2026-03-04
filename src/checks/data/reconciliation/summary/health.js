function computeSystemHealth(results, summary) {
  const calcRate = (v, t) => (t > 0 ? ((v / t) * 100).toFixed(2) + "%" : "0%");

  let totalPriceDiff = 0;
  let totalStockDiff = 0;

  let criticalIssues = 0;

  results.forEach((r) => {
    if (r.diff) {
      const priceDiff = Math.abs(r.diff.priceDiff || 0);
      const stockDiff = Math.abs(r.diff.quantityDiff || 0);

      totalPriceDiff += priceDiff;
      totalStockDiff += stockDiff;

      if (priceDiff >= 10 || stockDiff >= 10) {
        criticalIssues++;
      }
    }
  });

  // drift indexes
  summary.priceDriftIndex =
    summary.total > 0 ? (totalPriceDiff / summary.total).toFixed(2) : 0;

  summary.stockDriftIndex =
    summary.total > 0 ? (totalStockDiff / summary.total).toFixed(2) : 0;

  // impact rates
  summary.priceDriftRate = calcRate(
    summary.priceMismatch + summary.bothMismatch,
    summary.total,
  );

  summary.stockDriftRate = calcRate(
    summary.stockMismatch + summary.bothMismatch,
    summary.total,
  );

  // sync accuracy
  summary.syncAccuracy = calcRate(summary.match, summary.total);

  // catalog integrity
  summary.catalogIntegrity =
    summary.total > 0
      ? (100 - (summary.missing / summary.total) * 100).toFixed(2) + "%"
      : "100%";

  // impacted catalog
  summary.impactedCatalog = summary.mismatch + summary.missing;

  summary.impactedCatalogRate = calcRate(
    summary.impactedCatalog,
    summary.total,
  );

  // ---- HEALTH CALCULATION ----

  const missingRate =
    summary.total > 0 ? (summary.missing / summary.total) * 100 : 0;

  const priceRate = Number(summary.priceDriftRate.replace("%", ""));
  const stockRate = Number(summary.stockDriftRate.replace("%", ""));

  const criticalRate =
    summary.total > 0 ? (criticalIssues / summary.total) * 100 : 0;

  const health =
    100 -
    (missingRate * 0.45 +
      priceRate * 0.3 +
      stockRate * 0.15 +
      criticalRate * 0.1);

  summary.systemHealth = Math.max(0, health).toFixed(2) + "%";
}

module.exports = { computeSystemHealth };
