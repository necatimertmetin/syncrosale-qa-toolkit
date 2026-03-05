function runPrice(p) {
  const results = [];

  if (p.minPrice != null && p.maxPrice != null && p.minPrice > p.maxPrice) {
    results.push({
      type: "ANOMALY_MIN_GT_MAX",
      asin: p.asin,
      price: p.price,
      cost: p.cost,
    });
  }

  if (p.price != null && p.minPrice != null && p.price < p.minPrice) {
    results.push({
      type: "ANOMALY_PRICE_BELOW_MIN",
      asin: p.asin,
      price: p.price,
      cost: p.cost,
    });
  }

  if (p.price != null && p.maxPrice != null && p.price > p.maxPrice) {
    results.push({
      type: "ANOMALY_PRICE_ABOVE_MAX",
      asin: p.asin,
      price: p.price,
      cost: p.cost,
    });
  }

  return results;
}

module.exports = { runPrice };
