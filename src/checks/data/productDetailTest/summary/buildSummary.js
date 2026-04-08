const { render } = require("../renderer");

function pct(n, total) {
  if (!total) return 0;
  return Number(((n / total) * 100).toFixed(2));
}

function buildSummary(products, results, perProduct) {
  const total = products.length;
  const issueCount = results.length;

  // ── severity breakdown ──
  const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const r of results) {
    if (bySeverity[r.severity] != null) bySeverity[r.severity]++;
  }

  // ── by check type ──
  const byType = {};
  for (const r of results) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  // ── by category (group checks) ──
  const byCategory = {
    priceIntegrity: 0,
    supplierCrossCheck: 0,
    statusAnomalies: 0,
    competitive: 0,
    dataFreshness: 0,
    desi: 0,
  };

  for (const r of results) {
    const t = r.type;
    if (
      t.includes("PRICE") ||
      t.includes("BREAKDOWN") ||
      t.includes("COMMISSION_PCT") ||
      t.includes("PROFIT_TARGET") ||
      t.includes("CURRENCY") ||
      t === "MIN_GT_MAX_DETAIL"
    ) {
      byCategory.priceIntegrity++;
    } else if (
      t.includes("SUPPLIER") ||
      t === "PRICE_WITHOUT_SUPPLIER" ||
      t === "INACTIVE_SUPPLIER_ACTIVE_PRODUCT"
    ) {
      byCategory.supplierCrossCheck++;
    } else if (
      t.includes("BUYABLE") ||
      t.includes("ACTIVE") ||
      t.includes("CRITERIA") ||
      t.includes("REGRESSED")
    ) {
      byCategory.statusAnomalies++;
    } else if (
      t.includes("BUYBOX") ||
      t.includes("LOWEST") ||
      t.includes("OFFER") ||
      t.includes("FBA") ||
      t.includes("CHINA")
    ) {
      byCategory.competitive++;
    } else if (t.includes("STALE") || t.includes("SYNC_LAG")) {
      byCategory.dataFreshness++;
    } else if (t.includes("DESI") || t.includes("WAREHOUSE_COST_PER_DESI")) {
      byCategory.desi++;
    }
  }

  // ── affected products ──
  const affectedAsins = new Set(results.map((r) => r.asin).filter(Boolean));
  const cleanProducts = total - affectedAsins.size;

  // ── top offenders ──
  const topOffenders = (perProduct || [])
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 20);

  // ── health score ──
  // Normalize per-product: avg issues weighted by severity, scaled to 100
  const criticalWeight = bySeverity.CRITICAL * 10;
  const highWeight = bySeverity.HIGH * 5;
  const mediumWeight = bySeverity.MEDIUM * 2;
  const lowWeight = bySeverity.LOW * 0.5;

  const totalPenalty = criticalWeight + highWeight + mediumWeight + lowWeight;
  const avgPenaltyPerProduct = total > 0 ? totalPenalty / total : 0;
  // 20 penalty points per product = 0% health
  const maxPerProduct = 20;
  const healthScore = Math.max(
    0,
    Number(
      (
        100 -
        (Math.min(avgPenaltyPerProduct, maxPerProduct) / maxPerProduct) * 100
      ).toFixed(2),
    ),
  );

  const summary = {
    type: "SUMMARY",

    total,
    issueCount,
    affectedProducts: affectedAsins.size,
    cleanProducts,
    cleanRate: pct(cleanProducts, total),

    severity: bySeverity,
    byType,
    byCategory,

    topOffenders,

    healthScore,
  };

  // ── pretty report ──
  const lines = [];
  render(summary, lines, results);
  summary.prettyReport = lines.join("\n");

  return summary;
}

module.exports = { buildSummary };
