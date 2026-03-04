function computeSeverity(results, summary) {
  results.forEach((r) => {
    if (r.priceSeverity && r.priceSeverity !== "MATCH") {
      summary._priceSeverity[r.priceSeverity]++;
    }

    if (r.stockSeverity && r.stockSeverity !== "MATCH") {
      summary._stockSeverity[r.stockSeverity]++;
    }
  });
}

module.exports = { computeSeverity };
