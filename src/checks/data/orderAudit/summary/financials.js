module.exports = function financials(rows, summary) {
  let totalProfit = 0;

  rows.forEach((r) => {
    totalProfit += r.profit || 0;
  });

  summary.totalProfit = Number(totalProfit.toFixed(2));
};
