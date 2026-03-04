module.exports = function stats(rows, summary) {
  let totalValue = 0;

  rows.forEach((r) => {
    totalValue += r.orderTotal || 0;
  });

  summary.totalRevenue = Number(totalValue.toFixed(2));
  summary.avgOrderValue = Number((totalValue / rows.length).toFixed(2));
};
