function runStock(p) {
  const results = [];

  if (
    p.stock === 0 &&
    p.price > 0 &&
    !p.criteriaReason &&
    p.minPrice != null &&
    !p.criteriaReason
  ) {
    results.push({
      type: "ANOMALY_ACTIVE_STOCK_ZERO",
      asin: p.asin,
      price: p.price,
      stock: p.stock,
    });
  }

  if (p.stock < 0) {
    results.push({
      type: "ANOMALY_NEGATIVE_STOCK",
      asin: p.asin,
      price: p.price,
      stock: p.stock,
    });
  }

  return results;
}

module.exports = { runStock };
