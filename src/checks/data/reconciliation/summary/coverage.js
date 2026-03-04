function computeCoverage(summary, metrics = {}) {
  summary.syncroTotal = metrics.syncroTotal || 0;
  summary.amazonTotal = metrics.amazonTotal || 0;

  summary.syncroMatchedInAmazon = metrics.syncroMatchedInAmazon || 0;

  summary.coverageRate =
    metrics.coverageRate ||
    (summary.syncroTotal
      ? ((summary.syncroMatchedInAmazon / summary.syncroTotal) * 100).toFixed(
          2,
        ) + "%"
      : "0%");

  summary.catalogGap = summary.syncroTotal - summary.syncroMatchedInAmazon;
}

module.exports = { computeCoverage };
