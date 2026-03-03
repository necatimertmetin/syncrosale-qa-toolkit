function formatRate(count, rate) {
  if (count > 0 && rate === 0) return "~0%";
  return `${rate}%`;
}

// 🔥 BONUS: severity mapper
function getAnomalySeverity(type) {
  switch (type) {
    case "ANOMALY_COST_GT_PRICE":
      return "🔴 CRITICAL";
    case "ANOMALY_MISSING_COST_OR_PRICE":
      return "🟠 HIGH";
    case "ANOMALY_EXTREME_MARGIN":
      return "🟡 MEDIUM";
    case "ANOMALY_NEAR_ZERO_COST":
      return "🟢 LOW";
    case "ANOMALY_ZERO_COST":
      return "🟢 LOW";
    default:
      return "⚪ INFO";
  }
}

function render(summary, lines, allResults = []) {
  const m = summary.marginDistribution;

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

  // ---------------- HEADER ----------------
  lines.push("## 📊 Product Audit Summary\n");

  // ---------------- DEFINITIONS ----------------
  lines.push("### ℹ️ Definitions");
  lines.push(
    "- **Dead Stock**: Stock > 15 AND Rating < 4 → slow moving inventory",
  );
  lines.push("- **Gold Product**: Rating > 4.5 AND Margin > 30%");
  lines.push("- **Margin** = (Price - Cost) / Price");
  lines.push("");

  // ---------------- LEGEND ----------------
  lines.push("### 🎨 Margin Legend");
  lines.push("- 🟢 **EXCELLENT**: ≥ 40%");
  lines.push("- 🟡 **GOOD**: 25% – 40%");
  lines.push("- 🟠 **LOW**: 10% – 25%");
  lines.push("- 🟤 **VERY LOW**: 0% – 10%");
  lines.push("- 🔴 **LOSS**: < 0%");
  lines.push("- ⚪ **UNKNOWN**: invalid / missing data");
  lines.push("");

  // ---------------- DATA QUALITY ----------------
  lines.push("### 🧪 Data Quality");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");

  lines.push(`| Valid Rows | ${summary.meta?.computedMarginRows ?? "-"} |`);
  lines.push(`| Skipped Rows | ${summary.meta?.skippedRows ?? "-"} |`);
  lines.push(`| Valid Rate | ${summary.dataQuality?.validRate ?? "-"}% |`);
  lines.push(`| Invalid Rate | ${summary.dataQuality?.invalidRate ?? "-"}% |`);

  lines.push("");

  // ---------------- METRICS ----------------
  lines.push("### 📊 Metrics");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");

  lines.push(`| Total Products | ${summary.total} |`);

  lines.push(
    `| Dead Stock | ${summary.stockHealth.deadStock.count} (${summary.stockHealth.deadStock.rate}%) |`,
  );

  lines.push(
    `| Gold Products | ${summary.gold.count} (${summary.gold.rate}%) |`,
  );

  lines.push(
    `| Margin Distribution | 🟢 ${formatRate(
      m.EXCELLENT.count,
      m.EXCELLENT.rate,
    )} • 🟡 ${formatRate(m.GOOD.count, m.GOOD.rate)} • 🟠 ${formatRate(
      m.LOW.count,
      m.LOW.rate,
    )} • 🟤 ${formatRate(m.VERY_LOW.count, m.VERY_LOW.rate)} • 🔴 ${formatRate(
      m.LOSS.count,
      m.LOSS.rate,
    )} |`,
  );

  lines.push("");

  // ---------------- MARGIN BREAKDOWN ----------------
  lines.push("### 📦 Margin Breakdown");
  lines.push("| Bucket | Count | Rate |");
  lines.push("|--------|-------|------|");

  BUCKET_ORDER.forEach((k) => {
    const v = m[k];
    if (!v) return;

    lines.push(
      `| ${LABELS[k]} | ${v.count} | ${formatRate(v.count, v.rate)} |`,
    );
  });

  lines.push("\n---\n");

  // ---------------- PRODUCTS ----------------
  const topProducts = allResults.filter((r) => r.type === "TOP_MARGIN_PRODUCT");

  if (topProducts.length) {
    lines.push("### 🚀 Top Products (Highest Margin)");

    topProducts.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${p.asin} → margin ${p.margin} • profit ${p.profit}`,
      );
    });

    lines.push("");
  }

  const worstProducts = allResults.filter(
    (r) => r.type === "LOW_MARGIN_PRODUCT",
  );

  if (worstProducts.length) {
    lines.push("### 🧨 Worst Products (Lowest Margin)");

    worstProducts.forEach((p, i) => {
      lines.push(
        `${i + 1}. ${p.asin} → margin ${p.margin} • profit ${p.profit}`,
      );
    });

    lines.push("");
  }

  lines.push("\n---\n");

  // ---------------- INSIGHTS (DATA-AWARE) ----------------
  const insights = [];

  const reliable = (summary.dataQuality?.validRate ?? 0) > 80;

  if (!reliable) {
    insights.push(
      "⚠️ Low data reliability → many rows missing cost/price, insights may be misleading",
    );
  }

  if (reliable && m.EXCELLENT.rate > 60) {
    insights.push(
      "⚠️ High EXCELLENT margin ratio → possible pricing or cost anomaly",
    );
  }

  if (summary.gold.rate > 30) {
    insights.push("🟢 High Gold Product ratio → strong catalog quality");
  }

  if (summary.stockHealth.deadStock.rate > 5) {
    insights.push("📦 Elevated dead stock → potential overstock risk");
  }

  if (insights.length) {
    lines.push("## 🧠 Insights\n");
    insights.forEach((i) => lines.push(`- ${i}`));
    lines.push("\n---\n");
  }

  // ---------------- ANOMALIES ----------------
  lines.push("### 🚨 Anomalies");
  lines.push("| Type | Count |");
  lines.push("|------|-------|");

  Object.entries(summary.anomalies).forEach(([k, v]) => {
    lines.push(`| ${k} | ${v} |`);
  });

  lines.push("");

  // 🔥 DETAIL TABLE (WITH SEVERITY)
  const anomalyRows = allResults
    .filter((r) => r.type?.startsWith("ANOMALY"))
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0));

  if (anomalyRows.length) {
    lines.push("#### 🔍 Anomaly Details (Top 20)");
    lines.push("| Type | Severity | ASIN | Price | Cost | Margin |");
    lines.push("|------|----------|------|-------|------|--------|");

    anomalyRows.slice(0, 20).forEach((a) => {
      lines.push(
        `| ${a.type} | ${getAnomalySeverity(a.type)} | ${a.asin ?? "-"} | ${a.price ?? "-"} | ${a.cost ?? "-"} | ${a.margin ?? "-"} |`,
      );
    });

    lines.push("");
  }
}

module.exports = { render };
