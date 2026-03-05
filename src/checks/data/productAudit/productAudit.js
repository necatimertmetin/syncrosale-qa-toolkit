const { parseCSV } = require("./core/csvParser");
const { normalizeRow } = require("./core/normalize");

const { runPrice } = require("./core/price");
const { runStock } = require("./core/stock");

const { detectDuplicates } = require("./core/duplicate");

const { computeMargin } = require("./core/margin");

const { buildSummary } = require("./summary/buildSummary");

function audit(csvText) {
  const rows = parseCSV(csvText);

  const products = rows.map(normalizeRow);

  const results = [];

  for (const p of products) {
    const margin = computeMargin(p.price, p.cost);

    if (margin != null && margin < 0) {
      results.push({
        type: "ANOMALY_NEGATIVE_MARGIN",
        asin: p.asin,
        price: p.price,
        cost: p.cost,
        margin,
      });
    }

    // price anomalies
    results.push(...runPrice(p));

    // stock anomalies
    results.push(...runStock(p));
  }

  results.push(...detectDuplicates(products));

  const summary = buildSummary(products, results);

  return [summary, ...results];
}

module.exports = { audit };
