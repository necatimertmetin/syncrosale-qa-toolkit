module.exports = function commissions(rows, summary) {
  let totalCommission = 0;

  rows.forEach((r) => {
    totalCommission += r.amazonCommission || 0;
  });

  summary.totalCommission = Number(totalCommission.toFixed(2));
};
