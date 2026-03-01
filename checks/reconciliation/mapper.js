function round(num) {
  return typeof num === "number" ? Number(num.toFixed(2)) : null;
}

function mapToReportFormat(results) {
  return results.map((r) => ({
    type: "RECON",

    asin: r.asin,
    status: r.status,

    syncroPrice: r.syncro?.price ?? null,
    amazonPrice: r.amazon?.price ?? null,

    syncroStock: r.syncro?.quantity ?? null,
    amazonStock: r.amazon?.quantity ?? null,

    priceDiff: round(r.diff?.priceDiff),
    stockDiff: r.diff?.quantityDiff ?? null,
  }));
}

module.exports = { mapToReportFormat };
