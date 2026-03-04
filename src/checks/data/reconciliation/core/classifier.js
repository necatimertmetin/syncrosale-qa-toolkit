function classify(diff, syncro, amazon) {
  if (!amazon) return "MISSING_IN_AMAZON";
  if (!syncro) return "MISSING_IN_SYNCRO";

  if (!diff.priceMatch && !diff.quantityMatch)
    return "PRICE_AND_STOCK_MISMATCH";

  if (!diff.priceMatch) return "PRICE_MISMATCH";
  if (!diff.quantityMatch) return "STOCK_MISMATCH";

  return "MATCH";
}

module.exports = { classify };
