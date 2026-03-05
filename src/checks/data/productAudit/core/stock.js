function runStock(p) {
  const results = [];

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
