const { render } = require("../renderer");
const { computeMargin } = require("../core/margin");

function pct(n, total) {
  if (!total) return 0;
  return Number(((n / total) * 100).toFixed(2));
}

function buildSummary(products, results) {
  const total = products.length;

  const duplicates = results.filter((r) => r.type === "DUPLICATE_ASIN");

  const priceViolations = results.filter(
    (r) =>
      r.type === "ANOMALY_PRICE_BELOW_MIN" ||
      r.type === "ANOMALY_PRICE_ABOVE_MAX",
  );

  const negativeMargins = results.filter(
    (r) => r.type === "ANOMALY_NEGATIVE_MARGIN",
  );

  const missingData = products.filter(
    (p) =>
      p.price == null ||
      p.cost == null ||
      p.shippingCost == null ||
      p.commission == null,
  );

  const outOfCriteria = products.filter((p) => p.criteriaReason);

  const deadStock = products.filter(
    (p) => p.stock >= 19 && p.rating != null && p.rating < 4.2,
  );
  // ---------------- CATEGORY BREAKDOWN ----------------

  const categoryMap = new Map();

  for (const p of products) {
    if (!p.mainCategory) continue;

    if (!categoryMap.has(p.mainCategory)) {
      categoryMap.set(p.mainCategory, 0);
    }

    categoryMap.set(p.mainCategory, categoryMap.get(p.mainCategory) + 1);
  }

  const categoryBreakdown = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([category, count]) => ({
      category,
      count,
      rate: pct(count, total),
    }));

  // ---------------- COMMISSION ANALYSIS ----------------

  const commissionByCategory = new Map();

  for (const p of products) {
    if (!p.mainCategory || p.price == null || p.commission == null) continue;

    const rate = p.commission / p.price;

    if (!Number.isFinite(rate)) continue;

    if (!commissionByCategory.has(p.mainCategory)) {
      commissionByCategory.set(p.mainCategory, []);
    }

    commissionByCategory.get(p.mainCategory).push(rate);
  }

  const commissionSummary = [];

  for (const [cat, rates] of commissionByCategory) {
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

    commissionSummary.push({
      category: cat,
      avgRate: Number(avg.toFixed(3)),
      count: rates.length,
    });
  }

  commissionSummary.sort((a, b) => b.count - a.count);

  let goldProducts = 0;

  for (const p of products) {
    const margin = computeMargin(p.price, p.cost);

    if (margin != null && p.rating > 4.5 && margin > 0.3) {
      goldProducts++;
    }
  }

  // ---------------- ANOMALIES ----------------

  const anomalyCounts = {};

  for (const r of results) {
    if (!r.type?.startsWith("ANOMALY")) continue;

    if (!anomalyCounts[r.type]) {
      anomalyCounts[r.type] = 0;
    }

    anomalyCounts[r.type]++;
  }

  // ---------------- TOP ANOMALIES ----------------

  const topAnomalies = results
    .filter((r) => r.type?.startsWith("ANOMALY"))
    .slice(0, 50);

  // ---------------- HEALTH SCORE ----------------

  const duplicateRate = duplicates.length / total;
  const priceViolationRate = priceViolations.length / total;
  const marginRiskRate = negativeMargins.length / total;
  const missingDataRate = missingData.length / total;

  const healthScore = Number(
    (
      100 -
      (duplicateRate * 25 +
        priceViolationRate * 35 +
        marginRiskRate * 25 +
        missingDataRate * 15)
    ).toFixed(2),
  );

  const summary = {
    type: "SUMMARY",

    total,

    status: {
      outOfCriteria: outOfCriteria.length,
    },

    rates: {
      duplicateRate,
      priceViolationRate,
      marginRiskRate,
      missingDataRate,
    },

    negativeMargins: negativeMargins.length,

    categoryBreakdown,

    commissionSummary,

    anomalies: anomalyCounts,

    topAnomalies,

    healthScore,

    stockHealth: {
      deadStock: {
        count: deadStock.length,
        rate: pct(deadStock.length, total),
      },
    },

    gold: {
      count: goldProducts,
      rate: pct(goldProducts, total),
    },

    meta: {
      computedMarginRows: total - missingData.length,
      skippedRows: missingData.length,
    },

    dataQuality: {
      validRate: pct(total - missingData.length, total),
      invalidRate: pct(missingData.length, total),
    },
  };

  // ---------------- PRETTY REPORT ----------------

  const lines = [];

  render(summary, lines, results);

  summary.prettyReport = lines.join("\n");

  return summary;
}

module.exports = { buildSummary };
