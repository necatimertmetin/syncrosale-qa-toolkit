function getHealthBadge(score) {
  if (score >= 85) return "🟢 HEALTHY";
  if (score >= 70) return "🟡 MINOR ISSUES";
  if (score >= 55) return "🟠 MAJOR ISSUES";
  return "🔴 CRITICAL STATE";
}

function sevIcon(sev) {
  switch (sev) {
    case "CRITICAL":
      return "🔴";
    case "HIGH":
      return "🟠";
    case "MEDIUM":
      return "🟡";
    case "LOW":
      return "🟢";
    default:
      return "⚪";
  }
}

function render(summary, lines, allResults = []) {
  lines.push("# 🔬 Product Detail Test");
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Health ──
  const badge = getHealthBadge(summary.healthScore);
  lines.push("## 🧠 System Health");
  lines.push("");
  lines.push(`### ${badge} **${summary.healthScore}%**`);
  lines.push("_Product data integrity score_");
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Overview ──
  lines.push("## 📊 Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Products Tested | ${summary.total} |`);
  lines.push(`| Total Issues | ${summary.issueCount} |`);
  lines.push(`| Affected Products | ${summary.affectedProducts} |`);
  lines.push(
    `| Clean Products | ${summary.cleanProducts} (${summary.cleanRate}%) |`,
  );
  lines.push("");

  // ── Severity ──
  lines.push("## ⚡ Severity Breakdown");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("|----------|-------|");
  for (const [sev, count] of Object.entries(summary.severity)) {
    if (count > 0) {
      lines.push(`| ${sevIcon(sev)} ${sev} | ${count} |`);
    }
  }
  lines.push("");

  // ── By Category ──
  lines.push("## 🗂 Issues by Category");
  lines.push("");
  lines.push("| Category | Count |");
  lines.push("|----------|-------|");

  const catLabels = {
    priceIntegrity: "💰 Price Integrity",
    supplierCrossCheck: "📦 Supplier Cross-Check",
    statusAnomalies: "🚦 Status Anomalies",
    competitive: "🏆 Competitive Analysis",
    dataFreshness: "⏰ Data Freshness",
    desi: "📐 Desi Validation",
  };

  for (const [key, count] of Object.entries(summary.byCategory)) {
    if (count > 0) {
      lines.push(`| ${catLabels[key] || key} | ${count} |`);
    }
  }
  lines.push("");

  // ── By Type (detailed) ──
  const sortedTypes = Object.entries(summary.byType).sort(
    (a, b) => b[1] - a[1],
  );
  if (sortedTypes.length > 0) {
    lines.push("## 🔍 Issue Types");
    lines.push("");
    lines.push("| Type | Count |");
    lines.push("|------|-------|");
    for (const [type, count] of sortedTypes) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push("");
  }

  // ── Top Offenders ──
  if (summary.topOffenders?.length > 0) {
    lines.push("## 🎯 Top Offenders (most issues)");
    lines.push("");
    lines.push("| ASIN | Issues | 🔴 | 🟠 | 🟡 |");
    lines.push("|------|--------|-----|-----|-----|");
    for (const p of summary.topOffenders.slice(0, 15)) {
      lines.push(
        `| ${p.asin} | ${p.issueCount} | ${p.critical} | ${p.high} | ${p.medium} |`,
      );
    }
    lines.push("");
  }

  // ── Sample Issues ──
  const samples = allResults
    .filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH")
    .slice(0, 20);
  if (samples.length > 0) {
    lines.push("## 🚨 Critical & High Issues (sample)");
    lines.push("");
    for (const s of samples) {
      const extras = Object.entries(s)
        .filter(([k]) => !["type", "severity", "asin"].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      lines.push(
        `- ${sevIcon(s.severity)} **${s.type}** \`${s.asin}\` ${extras}`,
      );
    }
    lines.push("");
  }
}

module.exports = { render };
