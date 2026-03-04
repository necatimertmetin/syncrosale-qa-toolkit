function buildMarkdown(summary, worst) {
  const lines = [];

  // SYSTEM HEALTH

  lines.push("## 🧠 System Health\n");

  // ⭐ MAIN SCORE (headline metric)
  function getHealthBadge(score) {
    const n = Number(score.replace("%", ""));

    if (n >= 85) return "🟢 HEALTHY";
    if (n >= 70) return "🟡 STABLE";
    if (n >= 50) return "🟠 DEGRADED";
    return "🔴 CRITICAL";
  }
  const healthBadge = getHealthBadge(summary.systemHealth);

  lines.push(`### ${healthBadge} **${summary.systemHealth}**`);

  lines.push("_Overall synchronization reliability score_");

  lines.push(
    "_Calculated from the average impact of catalog gaps, price drift, and stock drift across the entire catalog._",
  );

  lines.push(
    "_Formula: 100 − avg(missingRate, priceDriftRate, stockDriftRate)_",
  );

  lines.push("\n---\n");

  // DETAIL METRICS

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Catalog Integrity | ${summary.catalogIntegrity} | % of ASINs existing in both systems |`,
  );

  lines.push(
    `| Sync Accuracy | ${summary.syncAccuracy} | % of products perfectly synced |`,
  );

  lines.push(
    `| Impacted Catalog | ${summary.impactedCatalogRate} | % of catalog affected by any issue |`,
  );

  lines.push(
    `| Price Drift Index | ${summary.priceDriftIndex} | Average absolute price difference |`,
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

  lines.push("\n---\n");

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

  lines.push(
    `| Mismatch Rate | ${summary.mismatchRate} | Any mismatch / total ASINs |`,
  );

  lines.push("\n---\n");

  // CATALOG COVERAGE

  lines.push("## 🧾 Catalog Coverage\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|--------|-------|-------------|");

  lines.push(
    `| Active SyncroSale Products | ${summary.syncroTotal} | Products marked ACTIVE in SyncroSale |`,
  );

  lines.push(
    `| Amazon Listings | ${summary.amazonTotal} | Listings found in Amazon inventory report |`,
  );

  lines.push(
    `| Syncro Products Found on Amazon | ${summary.syncroMatchedInAmazon} | SyncroSale ASINs that exist in Amazon |`,
  );

  lines.push(
    `| Catalog Coverage Rate | ${summary.coverageRate} | % of SyncroSale catalog available on Amazon |`,
  );

  lines.push(
    `| Missing From Amazon | ${summary.catalogGap} | SyncroSale products not found in Amazon listing report |`,
  );

  lines.push("\n---\n");

  // SEVERITY DEFINITIONS

  lines.push("## ℹ️ Severity Definitions\n");

  lines.push("**💰 Price Difference**");
  lines.push("- LOW: < 1");
  lines.push("- MEDIUM: 1 – 5");
  lines.push("- HIGH: 5 – 10");
  lines.push("- CRITICAL: 10+");

  lines.push("\n**📦 Stock Difference**");
  lines.push("- LOW: ≤ 2");
  lines.push("- MEDIUM: 3 – 5");
  lines.push("- HIGH: 6 – 10");
  lines.push("- CRITICAL: 10+");

  lines.push("\n---\n");

  // PRICE SEVERITY

  lines.push("## 💰 Price Mismatch Breakdown\n");

  lines.push("| Level | Count | Distribution | Global Impact |");
  lines.push("|------|------|-------------|--------------|");

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    lines.push(
      `| ${lvl} | ${summary[`priceSeverity_${lvl}`]} | ${summary[`priceSeverityRate_${lvl}`]} | ${summary[`priceSeverityGlobalRate_${lvl}`]} |`,
    );
  });

  lines.push("\n");

  // STOCK SEVERITY

  lines.push("## 📦 Stock Mismatch Breakdown\n");

  lines.push("| Level | Count | Distribution | Global Impact |");
  lines.push("|------|------|-------------|--------------|");

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    lines.push(
      `| ${lvl} | ${summary[`stockSeverity_${lvl}`]} | ${summary[`stockSeverityRate_${lvl}`]} | ${summary[`stockSeverityGlobalRate_${lvl}`]} |`,
    );
  });

  lines.push("\n---\n");

  // WORST ASINS

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

  return lines.join("\n");
}

module.exports = { buildMarkdown };
