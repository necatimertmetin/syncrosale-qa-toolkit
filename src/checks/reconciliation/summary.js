function buildSummary(results) {
  const summary = {
    type: "SUMMARY",
    total: results.length,

    match: 0,
    priceMismatch: 0,
    stockMismatch: 0,
    bothMismatch: 0,
    missing: 0,
  };

  results.forEach((r) => {
    switch (r.status) {
      case "MATCH":
        summary.match++;
        break;
      case "PRICE_MISMATCH":
        summary.priceMismatch++;
        break;
      case "STOCK_MISMATCH":
        summary.stockMismatch++;
        break;
      case "PRICE_AND_STOCK_MISMATCH":
        summary.bothMismatch++;
        break;
      case "MISSING_IN_AMAZON":
      case "MISSING_IN_SYNCRO":
        summary.missing++;
        break;
    }
  });

  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;

  summary.matchRate =
    summary.total > 0
      ? ((summary.match / summary.total) * 100).toFixed(2) + "%"
      : "0%";

  summary.mismatchRate =
    summary.total > 0
      ? ((summary.mismatch / summary.total) * 100).toFixed(2) + "%"
      : "0%";

  return summary;
}

module.exports = { buildSummary };
