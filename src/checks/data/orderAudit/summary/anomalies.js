module.exports = function desi(rows, summary) {
  let totalDesi = 0;
  let highDesi = 0;

  rows.forEach((r) => {
    const d = Number(r["Total Desi"]);

    if (!d) return;

    totalDesi += d;

    if (d >= 20) {
      highDesi++;
    }
  });

  summary.totalDesi = Number(totalDesi.toFixed(2));
  summary.avgDesi =
    rows.length > 0 ? Number((totalDesi / rows.length).toFixed(2)) : 0;

  summary.highDesiOrders = highDesi;
};
