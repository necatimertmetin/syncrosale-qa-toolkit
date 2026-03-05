function computeMargin(price, cost) {
  if (price == null || cost == null) return null;
  if (price === 0) return null;

  return (price - cost) / price;
}

function computeNetMargin(price, cost, shipping, commission) {
  if (price == null) return null;

  const net = price - (cost ?? 0) - (shipping ?? 0) - (commission ?? 0);

  return net / price;
}

module.exports = { computeMargin, computeNetMargin };
