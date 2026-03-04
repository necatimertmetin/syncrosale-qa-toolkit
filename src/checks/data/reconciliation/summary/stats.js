function computeStats(summary) {
  const calcRate = (v, t) => (t > 0 ? ((v / t) * 100).toFixed(2) + "%" : "0%");

  summary.missing = summary.missingInAmazon + summary.missingInSyncro;

  summary.mismatch =
    summary.priceMismatch + summary.stockMismatch + summary.bothMismatch;

  summary.matchRate = calcRate(summary.match, summary.total);
  summary.mismatchRate = calcRate(summary.mismatch, summary.total);

  summary.missingInAmazonRate = calcRate(
    summary.missingInAmazon,
    summary.total,
  );

  summary.missingInSyncroRate = calcRate(
    summary.missingInSyncro,
    summary.total,
  );

  const ps = summary._priceSeverity;
  const ss = summary._stockSeverity;

  const totalPriceSeverity = ps.LOW + ps.MEDIUM + ps.HIGH + ps.CRITICAL;

  const totalStockSeverity = ss.LOW + ss.MEDIUM + ss.HIGH + ss.CRITICAL;

  ["LOW", "MEDIUM", "HIGH", "CRITICAL"].forEach((lvl) => {
    summary[`priceSeverity_${lvl}`] = ps[lvl];
    summary[`stockSeverity_${lvl}`] = ss[lvl];

    summary[`priceSeverityRate_${lvl}`] = calcRate(ps[lvl], totalPriceSeverity);

    summary[`stockSeverityRate_${lvl}`] = calcRate(ss[lvl], totalStockSeverity);

    summary[`priceSeverityGlobalRate_${lvl}`] = calcRate(
      ps[lvl],
      summary.total,
    );

    summary[`stockSeverityGlobalRate_${lvl}`] = calcRate(
      ss[lvl],
      summary.total,
    );
  });
}

module.exports = { computeStats };
