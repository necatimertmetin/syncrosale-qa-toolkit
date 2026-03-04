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
    catalogGap:
      (metrics.syncroTotal || 0) - (metrics.syncroMatchedInAmazon || 0),

    _priceSeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    _stockSeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  // COUNTING
  results.forEach((r) => {
    switch (r.status) {
      case "MATCH":
        summary.match++;
        break;

      case "PRICE_MISMATCH":
        summary.priceMismatch++;
        break;

      case "STOCK_MISMATCH":
        summary.stockMismatch++;
        break;

      case "PRICE_AND_STOCK_MISMATCH":
        summary.bothMismatch++;
        break;

      case "MISSING_IN_AMAZON":
        summary.missingInAmazon++;
        return;

      case "MISSING_IN_SYNCRO":
        summary.missingInSyncro++;
        return;
    }

    if (r.priceSeverity && r.priceSeverity !== "MATCH") {
      summary._priceSeverity[r.priceSeverity]++;
    }

    if (r.stockSeverity && r.stockSeverity !== "MATCH") {
      summary._stockSeverity[r.stockSeverity]++;
    }
  });

  summary.missing = summary.missingInAmazon + summary.missingInSyncro;

  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;

  const calcRate = (v, t) => (t > 0 ? ((v / t) * 100).toFixed(2) + "%" : "0%");

  summary.matchRate = calcRate(summary.match, summary.total);
  summary.mismatchRate = calcRate(summary.mismatch, summary.total);

  summary.missingInAmazonRate = calcRate(
    summary.missingInAmazon,
    summary.total,
  );

  summary.missingInSyncroRate = calcRate(
    summary.missingInSyncro,
    summary.total,
  );

  // Severity stats
  const ps = summary._priceSeverity;
  const ss = summary._stockSeverity;

  const totalPriceSeverity = ps.LOW + ps.MEDIUM + ps.HIGH + ps.CRITICAL;

  const totalStockSeverity = ss.LOW + ss.MEDIUM + ss.HIGH + ss.CRITICAL;

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    summary[`priceSeverity_${lvl}`] = ps[lvl];
    summary[`stockSeverity_${lvl}`] = ss[lvl];

    summary[`priceSeverityRate_${lvl}`] = calcRate(ps[lvl], totalPriceSeverity);

    summary[`stockSeverityRate_${lvl}`] = calcRate(ss[lvl], totalStockSeverity);

    summary[`priceSeverityGlobalRate_${lvl}`] = calcRate(
      ps[lvl],
      summary.total,
    );

    summary[`stockSeverityGlobalRate_${lvl}`] = calcRate(
      ss[lvl],
      summary.total,
    );
  });

  // ============================
  // SYSTEM HEALTH CALCULATIONS
  // ============================

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

  summary.priceDriftRate = calcRate(
    summary.priceMismatch + summary.bothMismatch,
    summary.total,
  );

  summary.stockDriftRate = calcRate(
    summary.stockMismatch + summary.bothMismatch,
    summary.total,
  );

  summary.syncAccuracy = calcRate(summary.match, summary.total);

  summary.catalogIntegrity =
    summary.total > 0
      ? (100 - (summary.missing / summary.total) * 100).toFixed(2) + "%"
      : "100%";

  summary.impactedCatalog = summary.mismatch + summary.missing;

  summary.impactedCatalogRate = calcRate(
    summary.impactedCatalog,
    summary.total,
  );

  // SYSTEM HEALTH SCORE
  const missingRate =
    summary.total > 0 ? (summary.missing / summary.total) * 100 : 0;

  const priceRate = Number(summary.priceDriftRate.replace("%", ""));

  const stockRate = Number(summary.stockDriftRate.replace("%", ""));

  const avgIssueRate = (missingRate + priceRate + stockRate) / 3;

  summary.systemHealth = (100 - avgIssueRate).toFixed(2) + "%";

  // ============================
  // WORST ASINS
  // ============================

  const calculateScore = (r) => {
    if (!r.diff) return 0;

    const price = Math.abs(r.diff.priceDiff || 0);
    const stock = Math.abs(r.diff.quantityDiff || 0);

    return price + stock * 2;
  };

  const worst = results
    .filter((r) => r.diff)
    .map((r) => ({
      ...r,
      score: calculateScore(r),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ============================
  // MARKDOWN REPORT
  // ============================

  const lines = [];

  lines.push("## 📊 Summary\n");
  lines.push("| Metric | Value | Description |");
  lines.push("|--------|-------|-------------|");

  lines.push(
    `| Total ASINs Compared | ${summary.total} | Unique ASINs across both systems |`,
  );

  lines.push(
    `| Perfect Matches | ${summary.match} | Price and stock match exactly |`,
  );

  lines.push(
    `| Total Mismatches | ${summary.mismatch} | Price and/or stock mismatch |`,
  );

  lines.push(
    `| Missing in Amazon | ${summary.missingInAmazon} | ${summary.missingInAmazonRate} exist only in SyncroSale |`,
  );

  lines.push(
    `| Missing in SyncroSale | ${summary.missingInSyncro} | ${summary.missingInSyncroRate} exist only in Amazon |`,
  );

  lines.push(
    `| Match Rate | ${summary.matchRate} | Perfect matches / total ASINs |`,
  );

  lines.push("\n---\n");

  // SYSTEM HEALTH

  lines.push("## 🧠 System Health\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Catalog Integrity | ${summary.catalogIntegrity} | ASINs existing in both systems |`,
  );

  lines.push(
    `| Sync Accuracy | ${summary.syncAccuracy} | % of products perfectly synced |`,
  );

  lines.push(
    `| Price Drift Index | ${summary.priceDriftIndex} | Average price deviation |`,
  );

  lines.push(
    `| Price Drift Impact | ${summary.priceDriftRate} | % of catalog with price mismatch |`,
  );

  lines.push(
    `| Stock Drift Index | ${summary.stockDriftIndex} | Average stock difference |`,
  );

  lines.push(
    `| Stock Drift Impact | ${summary.stockDriftRate} | % of catalog with stock mismatch |`,
  );

  lines.push(
    `| Impacted Catalog | ${summary.impactedCatalogRate} | Products affected by any issue |`,
  );

  lines.push(
    `| System Health Score | ${summary.systemHealth} | Overall marketplace sync health |`,
  );

  lines.push("\n---\n");

  lines.push("## 🚨 Top 10 Worst ASINs\n");

  worst.forEach((r, i) => {
    const parts = [];

    if (r.priceSeverity !== "MATCH") {
      parts.push(
        `PRICE: ${r.syncro?.price ?? "-"} → ${r.amazon?.price ?? "-"} (Δ ${r.diff.priceDiff.toFixed(2)})`,
      );
    }

    if (r.stockSeverity !== "MATCH") {
      parts.push(
        `STOCK: ${r.syncro?.quantity ?? "-"} → ${r.amazon?.quantity ?? "-"} (Δ ${r.diff.quantityDiff})`,
      );
    }

    lines.push(`${i + 1}. ${r.asin} [${parts.join(" | ")}]`);
  });

  summary._prettyReport = lines.join("\n");

  delete summary._priceSeverity;
  delete summary._stockSeverity;

  return summary;
}

module.exports = { buildSummary };
