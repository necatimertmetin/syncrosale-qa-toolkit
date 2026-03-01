function buildSummary(results) {
  const summary = {
    type: "SUMMARY",
    total: results.length,

    match: 0,
    priceMismatch: 0,
    stockMismatch: 0,
    bothMismatch: 0,
    missing: 0,

    _priceSeverity: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },

    _stockSeverity: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },
  };

  // 🔹 COUNTING
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
      case "MISSING_IN_SYNCRO":
        summary.missing++;
        return;
    }

    if (r.priceSeverity && r.priceSeverity !== "MATCH") {
      summary._priceSeverity[r.priceSeverity]++;
    }

    if (r.stockSeverity && r.stockSeverity !== "MATCH") {
      summary._stockSeverity[r.stockSeverity]++;
    }
  });

  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;

  const calcRate = (v, t) => (t > 0 ? ((v / t) * 100).toFixed(2) + "%" : "0%");

  summary.matchRate = calcRate(summary.match, summary.total);
  summary.mismatchRate = calcRate(summary.mismatch, summary.total);

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

  // 🔥 TOP WORST ASINS
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

  // 🔥 MARKDOWN REPORT
  const lines = [];

  // SUMMARY
  lines.push("## 📊 Summary\n");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total | ${summary.total} |`);
  lines.push(`| Match | ${summary.match} |`);
  lines.push(`| Mismatch | ${summary.mismatch} |`);
  lines.push(`| Missing | ${summary.missing} |`);
  lines.push(`| Match Rate | ${summary.matchRate} |`);
  lines.push(`| Mismatch Rate | ${summary.mismatchRate} |`);

  lines.push("\n---\n");

  // DEFINITIONS
  lines.push("## ℹ️ Severity Definitions\n");

  lines.push("**💰 Price Difference (USD)**");
  lines.push("- LOW: < 1");
  lines.push("- MEDIUM: 1 – 5");
  lines.push("- HIGH: 5 – 10");
  lines.push("- CRITICAL: 10+\n");

  lines.push("**📦 Stock Difference (Units)**");
  lines.push("- LOW: ≤ 2");
  lines.push("- MEDIUM: 3 – 5");
  lines.push("- HIGH: 6 – 10");
  lines.push("- CRITICAL: 10+\n");

  lines.push("---\n");

  // PRICE TABLE
  lines.push("## 💰 Price Mismatch Breakdown\n");
  lines.push("| Level | Count | Distribution | Global Impact |");
  lines.push("|------|------|-------------|--------------|");

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    lines.push(
      `| ${lvl} | ${summary[`priceSeverity_${lvl}`]} | ${summary[`priceSeverityRate_${lvl}`]} | ${summary[`priceSeverityGlobalRate_${lvl}`]} |`,
    );
  });

  lines.push("\n");

  // STOCK TABLE
  lines.push("## 📦 Stock Mismatch Breakdown\n");
  lines.push("| Level | Count | Distribution | Global Impact |");
  lines.push("|------|------|-------------|--------------|");

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    lines.push(
      `| ${lvl} | ${summary[`stockSeverity_${lvl}`]} | ${summary[`stockSeverityRate_${lvl}`]} | ${summary[`stockSeverityGlobalRate_${lvl}`]} |`,
    );
  });

  lines.push("\n---\n");

  // 🔥 TOP WORST LIST (FIXED RENDER)
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

  lines.push("\n---\n");

  // 🔥 SMART INSIGHT (GLOBAL BASED)
  const globalCritical = Number(
    summary.priceSeverityGlobalRate_CRITICAL.replace("%", ""),
  );

  if (globalCritical > 5) {
    lines.push(
      `🚨 High price impact (${summary.priceSeverityGlobalRate_CRITICAL}) → large portion of catalog affected`,
    );
  } else if (globalCritical > 1) {
    lines.push(
      `⚠️ Moderate price impact (${summary.priceSeverityGlobalRate_CRITICAL})`,
    );
  } else {
    lines.push(
      `ℹ️ Low price impact (${summary.priceSeverityGlobalRate_CRITICAL})`,
    );
  }

  const stockCritical = Number(
    summary.stockSeverityGlobalRate_CRITICAL.replace("%", ""),
  );

  if (stockCritical > 5) {
    lines.push(
      `🚨 High stock impact (${summary.stockSeverityGlobalRate_CRITICAL})`,
    );
  } else if (stockCritical > 1) {
    lines.push(
      `⚠️ Moderate stock impact (${summary.stockSeverityGlobalRate_CRITICAL})`,
    );
  } else {
    lines.push(
      `ℹ️ Low stock impact (${summary.stockSeverityGlobalRate_CRITICAL})`,
    );
  }

  lines.push("");

  // 🔥 sadece console/debug için (reporter'a girmez)
  summary._prettyReport = lines.join("\n");

  delete summary._priceSeverity;
  delete summary._stockSeverity;

  return summary;
}

module.exports = { buildSummary };
