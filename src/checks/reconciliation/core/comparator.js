const { isEqual } = require("../utils/helpers");

function compare(syncro, amazon) {
  return {
    priceDiff: syncro.price - amazon.price,
    quantityDiff: syncro.quantity - amazon.quantity,
    priceMatch: isEqual(syncro.price, amazon.price),
    quantityMatch: syncro.quantity === amazon.quantity,
  };
}

function getPriceSeverity(diff) {
  const abs = Math.abs(diff);

  if (abs === 0) return "MATCH";
  if (abs < 1) return "LOW";
  if (abs < 5) return "MEDIUM";
  if (abs < 10) return "HIGH";
  return "CRITICAL";
}

function getStockSeverity(diff) {
  const abs = Math.abs(diff);

  if (abs === 0) return "MATCH";
  if (abs <= 2) return "LOW";
  if (abs <= 5) return "MEDIUM";
  if (abs <= 10) return "HIGH";
  return "CRITICAL";
}

module.exports = { compare, getPriceSeverity, getStockSeverity };
