function round(num) {
  return typeof num === "number" ? Number(num.toFixed(2)) : null;
}

function mapToReportFormat(results) {
  return results.map((r) => ({
    asin: r.asin,
    status: r.status,

    sellerflashPrice: r.sellerflash?.price ?? null,
    amazonPrice: r.amazon?.price ?? null,

    sellerflashStock: r.sellerflash?.quantity ?? null,
    amazonStock: r.amazon?.quantity ?? null,

    priceDiff: round(r.diff?.priceDiff),
    stockDiff: r.diff?.quantityDiff ?? null,
  }));
}

module.exports = { mapToReportFormat };
