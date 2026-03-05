function pct(v) {
  if (v == null) return "-";
  return `${v}%`;
}

function formatRate(count, rate) {
  if (count > 0 && rate === 0) return "~0%";
  return `${rate}%`;
}

function getAnomalySeverity(type) {
  switch (type) {
    case "ANOMALY_COST_GT_PRICE":
    case "ANOMALY_NEGATIVE_MARGIN":
      return "🔴 CRITICAL";

    case "ANOMALY_MISSING_COST_OR_PRICE":
    case "ANOMALY_PRICE_BELOW_MIN":
    case "ANOMALY_PRICE_ABOVE_MAX":
      return "🟠 HIGH";

    case "ANOMALY_EXTREME_MARGIN":
      return "🟡 MEDIUM";

    case "ANOMALY_NEAR_ZERO_COST":
    case "ANOMALY_ZERO_COST":
      return "🟢 LOW";

    default:
      return "⚪ INFO";
  }
}

function getHealthBadge(score) {
  if (score >= 85) return "🟢 HEALTHY";
  if (score >= 70) return "🟡 MINOR ISSUES";
  if (score >= 55) return "🟠 MAJOR ISSUES";
  return "🔴 CRITICAL STATE";
}

function render(summary, lines, allResults = []) {
  const m = summary.marginDistribution || {};

  const BUCKET_ORDER = [
    "EXCELLENT",
    "GOOD",
    "LOW",
    "VERY_LOW",
    "LOSS",
    "UNKNOWN",
  ];

  const LABELS = {
    LOSS: "🔴 LOSS",
    VERY_LOW: "🟤 VERY LOW",
    LOW: "🟠 LOW",
    GOOD: "🟡 GOOD",
    EXCELLENT: "🟢 EXCELLENT",
    UNKNOWN: "⚪ UNKNOWN",
  };

  // ------------------------------------------------
  // HEADER
  // ------------------------------------------------

  lines.push(`# 📊 Product Audit`);
  lines.push("");

  lines.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
  lines.push("");

  lines.push("---");
  lines.push("");

  // ------------------------------------------------
  // SYSTEM HEALTH
  // ------------------------------------------------

  const healthScore = summary.healthScore ?? 80;
  const badge = getHealthBadge(healthScore);

  lines.push(`## 🧠 System Health`);
  lines.push("");

  lines.push(`### ${badge} **${healthScore}%**`);

  lines.push("_Overall catalog reliability score_");
  lines.push("");

  lines.push("---");
  lines.push("");

  // ------------------------------------------------
  // DATA QUALITY
  // ------------------------------------------------

  lines.push(`## 🧪 Data Quality`);
  lines.push("");

  lines.push("| Metric | Value |");
  lines.push("|------|------|");

  lines.push(`| Valid Rows | ${summary.meta?.computedMarginRows ?? "-"} |`);
  lines.push(`| Skipped Rows | ${summary.meta?.skippedRows ?? "-"} |`);

  lines.push(`| Valid Rate | ${pct(summary.dataQuality?.validRate)} |`);
  lines.push(`| Invalid Rate | ${pct(summary.dataQuality?.invalidRate)} |`);

  lines.push("");

  // ------------------------------------------------
  // STATUS BREAKDOWN
  // ------------------------------------------------

  lines.push("## 📦 Listing Status");
  lines.push("");

  lines.push("| Status | Count |");
  lines.push("|------|------|");

  lines.push(`| Active | ${summary.status?.active ?? 0} |`);
  lines.push(`| Inactive | ${summary.status?.inactive ?? 0} |`);
  lines.push(`| Out Of Criteria | ${summary.status?.outOfCriteria ?? 0} |`);

  lines.push("");

  // ------------------------------------------------
  // CORE METRICS
  // ------------------------------------------------

  lines.push("## 📊 Core Metrics");
  lines.push("");

  lines.push("| Metric | Value |");
  lines.push("|------|------|");

  lines.push(`| Total Products | ${summary.total} |`);

  lines.push(
    `| Dead Stock | ${summary.stockHealth?.deadStock?.count ?? 0} (${pct(summary.stockHealth?.deadStock?.rate)}) |`,
  );

  lines.push(
    `| Gold Products | ${summary.gold?.count ?? 0} (${pct(summary.gold?.rate)}) |`,
  );

  lines.push(`| Negative Margin | ${summary.negativeMargins ?? 0} |`);

  lines.push("");

  // ------------------------------------------------
  // RATES
  // ------------------------------------------------

  lines.push("## 📈 Risk Indicators");
  lines.push("");

  lines.push("| Metric | Rate |");
  lines.push("|------|------|");

  lines.push(`| Duplicate Rate | ${pct(summary.rates?.duplicateRate)} |`);
  lines.push(
    `| Price Violation Rate | ${pct(summary.rates?.priceViolationRate)} |`,
  );
  lines.push(`| Margin Risk Rate | ${pct(summary.rates?.marginRiskRate)} |`);
  lines.push(`| Missing Data Rate | ${pct(summary.rates?.missingDataRate)} |`);

  lines.push("");

  // ------------------------------------------------
  // MARGIN DISTRIBUTION
  // ------------------------------------------------

  if (m.EXCELLENT) {
    lines.push("## 💰 Margin Distribution");
    lines.push("");

    lines.push("| Bucket | Count | Rate |");
    lines.push("|------|------|------|");

    BUCKET_ORDER.forEach((k) => {
      const v = m[k];

      if (!v) return;

      lines.push(
        `| ${LABELS[k]} | ${v.count} | ${formatRate(v.count, v.rate)} |`,
      );
    });

    lines.push("");
  }

  // ------------------------------------------------
  // CATEGORY DISTRIBUTION
  // ------------------------------------------------

  if (summary.categoryBreakdown?.length) {
    lines.push("## 🗂 Category Distribution");
    lines.push("");

    lines.push("| Category | Products | Rate |");
    lines.push("|------|------|------|");

    summary.categoryBreakdown.forEach((c) => {
      lines.push(`| ${c.category} | ${c.count} | ${pct(c.rate)} |`);
    });

    lines.push("");
  }

  // ------------------------------------------------
  // COMMISSION ANALYSIS
  // ------------------------------------------------

  if (summary.commissionSummary?.length) {
    lines.push("## 💰 Amazon Commission Analysis");
    lines.push("");

    lines.push("| Category | Avg Rate | Products |");
    lines.push("|------|------|------|");

    summary.commissionSummary.slice(0, 20).forEach((c) => {
      lines.push(
        `| ${c.category} | ${(c.avgRate * 100).toFixed(2)}% | ${c.count} |`,
      );
    });

    lines.push("");
  }

  // ------------------------------------------------
  // INSIGHTS
  // ------------------------------------------------

  const insights = [];

  const reliable = (summary.dataQuality?.validRate ?? 0) > 80;

  if (!reliable)
    insights.push("⚠️ Low data reliability → many rows missing cost/price");

  if (summary.stockHealth?.deadStock?.rate > 5)
    insights.push("📦 Dead stock ratio elevated → inventory risk");

  if (summary.rates?.marginRiskRate > 10)
    insights.push("⚠️ Large portion of catalog has low or negative margins");

  if (summary.rates?.duplicateRate > 1)
    insights.push("⚠️ Duplicate ASINs detected → possible catalog duplication");

  if (insights.length) {
    lines.push("## 🧠 Insights");
    lines.push("");

    insights.forEach((i) => lines.push(`- ${i}`));

    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ------------------------------------------------
  // ANOMALY SUMMARY
  // ------------------------------------------------

  lines.push("## 🚨 Anomaly Summary");
  lines.push("");

  lines.push("| Type | Count |");
  lines.push("|------|------|");

  Object.entries(summary.anomalies || {}).forEach(([k, v]) => {
    lines.push(`| ${k} | ${v} |`);
  });

  lines.push("");

  // ------------------------------------------------
  // TOP ANOMALIES
  // ------------------------------------------------

  const anomalyRows = allResults
    .filter((r) => r.type?.startsWith("ANOMALY"))
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));

  if (anomalyRows.length) {
    lines.push("## 🔍 Top 50 Anomalies");
    lines.push("");

    lines.push("| Type | Severity | ASIN | Price | Cost | Margin |");
    lines.push("|------|------|------|------|------|------|");

    anomalyRows.slice(0, 50).forEach((a) => {
      lines.push(
        `| ${a.type} | ${getAnomalySeverity(a.type)} | ${a.asin ?? "-"} | ${a.price ?? "-"} | ${a.cost ?? "-"} | ${a.margin ?? "-"} |`,
      );
    });

    lines.push("");
  }
}

module.exports = { render };
