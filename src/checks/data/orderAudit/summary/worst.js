module.exports = function worst(rows, summary) {
  const sorted = [...rows]
    .sort((a, b) => (a.profit || 0) - (b.profit || 0))
    .slice(0, 10);

  summary.worstOrders = sorted.map((r) => ({
    orderId: r.orderId,
    profit: r.profit || 0,
  }));
};
