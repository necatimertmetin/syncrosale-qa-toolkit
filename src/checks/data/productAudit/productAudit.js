// audit.js
const { parseCSV } = require("../../../parsers/csvParser2");

// ---------------- utils ----------------
function toNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

function toNumber(v) {
  const val = toNull(v);
  if (val === null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function pct(count, total) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function round(n, d = 2) {
  if (!Number.isFinite(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

// ---------------- helpers ----------------
function getBrand(row) {
  const raw = toNull(row["Brand"]);
  if (!raw) return "UNKNOWN";
  if (raw.includes("SF-")) return "UNKNOWN";
  if (/^\d+$/.test(raw)) return "UNKNOWN";
  if (raw.length < 2) return "UNKNOWN";
  return raw;
}

function base(row) {
  return {
    asin: toNull(row["Asin"]),
    sku: toNull(row["SKU"]),
    brand: getBrand(row),
    productName: toNull(row["Product Name"])?.slice(0, 80) ?? null,
  };
}

function getMarginBucket(m) {
  if (!Number.isFinite(m)) return "UNKNOWN";
  if (m < 0) return "LOSS";
  if (m < 0.1) return "VERY_LOW";
  if (m < 0.25) return "LOW";
  if (m < 0.4) return "GOOD";
  return "EXCELLENT";
}

// ---------------- audit ----------------
function audit(csvText) {
  const rows = parseCSV(csvText);

  const results = [];
  const marginList = [];

  let deadStockCount = 0;
  let goldCount = 0;

  // margin distribution only for rows where margin is computed
  const marginDist = {
    LOSS: 0,
    VERY_LOW: 0,
    LOW: 0,
    GOOD: 0,
    EXCELLENT: 0,
    UNKNOWN: 0,
  };

  // 🔥 anomaly trackers (for summary counts)
  const anomalies = {
    zeroCost: [],
    nearZeroCost: [],
    extremeMargin: [],
    // split invalid types for better debugging
    missingCostOrPrice: [],
    costGreaterThanPrice: [],
  };

  let computedMarginRows = 0; // for sanity

  for (const r of rows) {
    const price = toNumber(r["Price"]);
    const cost = toNumber(r["Cost"]);
    const rating = toNumber(r["Review Rate"]);
    const stock = toNumber(r["Stock"]);

    const b = base(r);

    // ---------------- HARD VALIDATION ----------------
    if (price == null || cost == null) {
      anomalies.missingCostOrPrice.push({ ...b, price, cost });

      results.push({
        type: "ANOMALY_MISSING_COST_OR_PRICE",
        ...b,
        price,
        cost,
      });

      // margin distribution'a dahil etme
      continue;
    }

    // 🔥 INVALID COST → SKIP FULLY (margin yok)
    if (cost > price) {
      anomalies.costGreaterThanPrice.push({ ...b, price, cost });

      results.push({
        type: "ANOMALY_COST_GT_PRICE",
        ...b,
        price,
        cost,
      });

      // margin distribution / gold / deadstock gibi metriklere dahil etme
      continue;
    }

    // ---------------- SAFE CALC ----------------
    const profit = price - cost;
    const margin = price > 0 ? profit / price : null;

    // ---------------- ANOMALIES ----------------
    if (cost === 0) {
      anomalies.zeroCost.push({ ...b, price, cost, margin });

      results.push({
        type: "ANOMALY_ZERO_COST",
        ...b,
        price,
        cost,
        margin: round(margin, 2),
      });
    }

    // NEAR ZERO COST (<5% of price)
    if (price > 0 && cost / price < 0.05) {
      anomalies.nearZeroCost.push({ ...b, price, cost, margin });

      results.push({
        type: "ANOMALY_NEAR_ZERO_COST",
        ...b,
        price,
        cost,
        margin: round(margin, 2),
      });
    }

    // EXTREME MARGIN (>90%)
    if (margin !== null && margin > 0.9) {
      anomalies.extremeMargin.push({ ...b, price, cost, margin });

      results.push({
        type: "ANOMALY_EXTREME_MARGIN",
        ...b,
        price,
        cost,
        margin: round(margin, 2),
      });
    }

    // ---------------- DISTRIBUTION ----------------
    if (margin !== null) {
      computedMarginRows++;
      const bucket = getMarginBucket(margin);
      if (marginDist[bucket] === undefined) marginDist.UNKNOWN++;
      else marginDist[bucket]++;
    } else {
      marginDist.UNKNOWN++;
    }

    // ---------------- FINDINGS ----------------
    if (stock != null && stock > 15 && rating != null && rating < 4) {
      deadStockCount++;
      results.push({
        type: "DEAD_STOCK",
        ...b,
        stock,
        rating,
      });
    }

    if (rating != null && rating > 4.5 && margin !== null && margin > 0.3) {
      goldCount++;
      results.push({
        type: "GOLD_PRODUCT",
        ...b,
        rating,
        margin: round(margin, 2),
      });
    }

    // ---------------- COLLECT ----------------
    marginList.push({ ...b, margin, price, cost, profit });
  }

  // ---------------- TOP / WORST ----------------
  const sorted = marginList
    .filter((p) => p.margin !== null)
    .sort((a, b) => b.margin - a.margin);

  const topProducts = sorted.slice(0, 5).map((p) => ({
    type: "TOP_MARGIN_PRODUCT",
    asin: p.asin,
    margin: round(p.margin, 2),
    price: round(p.price, 2),
    cost: round(p.cost, 2),
    profit: round(p.profit, 2),
  }));

  const worstProducts = sorted.slice(-5).map((p) => ({
    type: "LOW_MARGIN_PRODUCT",
    asin: p.asin,
    margin: round(p.margin, 2),
    price: round(p.price, 2),
    cost: round(p.cost, 2),
    profit: round(p.profit, 2),
  }));

  const total = rows.length;

  // IMPORTANT: marginDistribution rate'leri total yerine computedMarginRows üzerinden daha doğru olur.
  // Ama sen raporda total ürün üzerinden gösteriyorsun; o yüzden iki değeri de veriyorum.
  const summary = {
    type: "SUMMARY",
    total,

    meta: {
      computedMarginRows, // dağıtımın dayandığı satır sayısı
      skippedRows: total - computedMarginRows, // cost/price invalid olanlar ağırlıklı
    },
    dataQuality: {
      validRate: pct(computedMarginRows, total),
      invalidRate: pct(total - computedMarginRows, total),
    },
    stockHealth: {
      deadStock: { count: deadStockCount, rate: pct(deadStockCount, total) },
    },

    gold: {
      count: goldCount,
      rate: pct(goldCount, total),
    },

    // rates are based on TOTAL for backward-compatibility with your report,
    // but now you can also show "computedMarginRows" to avoid confusion
    marginDistribution: {
      LOSS: { count: marginDist.LOSS, rate: pct(marginDist.LOSS, total) },
      VERY_LOW: {
        count: marginDist.VERY_LOW,
        rate: pct(marginDist.VERY_LOW, total),
      },
      LOW: { count: marginDist.LOW, rate: pct(marginDist.LOW, total) },
      GOOD: { count: marginDist.GOOD, rate: pct(marginDist.GOOD, total) },
      EXCELLENT: {
        count: marginDist.EXCELLENT,
        rate: pct(marginDist.EXCELLENT, total),
      },
      UNKNOWN: {
        count: marginDist.UNKNOWN,
        rate: pct(marginDist.UNKNOWN, total),
      },
    },

    anomalies: {
      zeroCost: anomalies.zeroCost.length,
      nearZeroCost: anomalies.nearZeroCost.length,
      extremeMargin: anomalies.extremeMargin.length,
      missingCostOrPrice: anomalies.missingCostOrPrice.length,
      costGreaterThanPrice: anomalies.costGreaterThanPrice.length,
    },
  };

  return [summary, ...results, ...topProducts, ...worstProducts];
}

module.exports = { audit };
