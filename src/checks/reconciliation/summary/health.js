function computeSystemHealth(results, summary) {
  const calcRate = (v, t) => (t > 0 ? ((v / t) * 100).toFixed(2) + "%" : "0%");

  let totalPriceDiff = 0;
  let totalStockDiff = 0;

  results.forEach((r) => {
    if (r.diff) {
      totalPriceDiff += Math.abs(r.diff.priceDiff || 0);
      totalStockDiff += Math.abs(r.diff.quantityDiff || 0);
    }
  });

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

  // system health score
  const missingRate =
    summary.total > 0 ? (summary.missing / summary.total) * 100 : 0;

  const priceRate = Number(summary.priceDriftRate.replace("%", ""));
  const stockRate = Number(summary.stockDriftRate.replace("%", ""));

  const avgIssueRate = (missingRate + priceRate + stockRate) / 3;

  summary.systemHealth = (100 - avgIssueRate).toFixed(2) + "%";
}

module.exports = { computeSystemHealth };
