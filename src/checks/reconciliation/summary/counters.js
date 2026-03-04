function computeCounters(results, summary) {
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
        summary.missingInAmazon++;
        return;

      case "MISSING_IN_SYNCRO":
        summary.missingInSyncro++;
        return;
    }
  });

  summary.missing = summary.missingInAmazon + summary.missingInSyncro;

  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;
}

module.exports = { computeCounters };
