module.exports = function margins(rows, summary) {
  let totalMargin = 0;
  let count = 0;

  rows.forEach((r) => {
    if (!r.orderTotal || !r.profit) return;

    totalMargin += r.profit / r.orderTotal;
    count++;
  });

  summary.avgMargin =
    count > 0 ? Number(((totalMargin / count) * 100).toFixed(2)) : 0;
};
