function computeCommissionRate(p) {
  if (p.price == null || p.commission == null) return null;

  return p.commission / p.price;
}

module.exports = { computeCommissionRate };
