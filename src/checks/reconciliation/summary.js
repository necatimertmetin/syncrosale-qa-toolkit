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

  // 🔹 BASIC METRICS
  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;

  const calcRate = (value, total) =>
    total > 0 ? ((value / total) * 100).toFixed(2) + "%" : "0%";

  summary.matchRate = calcRate(summary.match, summary.total);
  summary.mismatchRate = calcRate(summary.mismatch, summary.total);

  const ps = summary._priceSeverity;
  const ss = summary._stockSeverity;

  const totalPriceSeverity = ps.LOW + ps.MEDIUM + ps.HIGH + ps.CRITICAL;
  const totalStockSeverity = ss.LOW + ss.MEDIUM + ss.HIGH + ss.CRITICAL;

  // 🔹 FLATTEN + RATES
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

  // 🔹 HELPER
  const toNumber = (v) => Number(String(v).replace("%", ""));

  const priceCriticalGlobal = toNumber(
    summary.priceSeverityGlobalRate_CRITICAL,
  );

  const stockCriticalGlobal = toNumber(
    summary.stockSeverityGlobalRate_CRITICAL,
  );

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

  // 🔥 PRICE INSIGHT (GLOBAL BASED)
  if (priceCriticalGlobal > 5) {
    lines.push(
      `🚨 High critical price impact (${summary.priceSeverityGlobalRate_CRITICAL}) → pricing sync broken`,
    );
  } else if (priceCriticalGlobal > 1) {
    lines.push(
      `⚠️ Noticeable price impact (${summary.priceSeverityGlobalRate_CRITICAL})`,
    );
  } else {
    lines.push(
      `ℹ️ Low critical price impact (${summary.priceSeverityGlobalRate_CRITICAL})`,
    );
  }

  // 🔥 STOCK INSIGHT (GLOBAL BASED)
  if (stockCriticalGlobal > 5) {
    lines.push(
      `🚨 High critical stock impact (${summary.stockSeverityGlobalRate_CRITICAL}) → inventory sync broken`,
    );
  } else if (stockCriticalGlobal > 1) {
    lines.push(
      `⚠️ Noticeable stock impact (${summary.stockSeverityGlobalRate_CRITICAL})`,
    );
  } else {
    lines.push(
      `ℹ️ Low stock impact (${summary.stockSeverityGlobalRate_CRITICAL})`,
    );
  }

  // 🔥 BONUS (hangisi daha kötü)
  if (stockCriticalGlobal > priceCriticalGlobal) {
    lines.push("📦 Stock mismatches dominate → inventory sync öncelikli");
  } else if (priceCriticalGlobal > stockCriticalGlobal) {
    lines.push("💰 Price mismatches dominate → pricing sync öncelikli");
  }

  // 🔥 missing insight
  if (summary.missing > summary.total * 0.3) {
    lines.push(
      `⚠️ High missing rate (${calcRate(summary.missing, summary.total)}) → mapping/filter issue olabilir`,
    );
  }

  lines.push("");

  summary.prettyReport = lines.join("\n");

  delete summary._priceSeverity;
  delete summary._stockSeverity;

  return summary;
}

module.exports = { buildSummary };
