const { isEqual } = require("../utils/helpers");

function compare(syncro, amazon) {
  const priceDiff = syncro.price - amazon.price;

  const quantityDiff = syncro.quantity - amazon.quantity;

  const priceMatch = isEqual(syncro.price, amazon.price);

  // 🔥 custom business rule
  const quantityMatch =
    syncro.quantity === amazon.quantity ||
    (syncro.quantity === 20 && amazon.quantity >= 20);

  return {
    priceDiff,
    quantityDiff,
    priceMatch,
    quantityMatch,
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
