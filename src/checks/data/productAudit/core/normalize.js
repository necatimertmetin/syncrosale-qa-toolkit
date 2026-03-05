function toNull(v) {
  if (v === undefined || v === null) return null;

  const s = String(v).trim();

  if (!s) return null;
  if (s.toLowerCase() === "null") return null;

  return s;
}

function toNumber(v) {
  const val = toNull(v);

  if (val === null) return null;

  const normalized = val.replace(",", ".");
  const n = Number(normalized);

  return Number.isFinite(n) ? n : null;
}

function normalizeRow(r) {
  return {
    asin: toNull(r["Asin"]),
    sku: toNull(r["SKU"]),
    brand: toNull(r["Brand"]) || "UNKNOWN",
    productName: toNull(r["Product Name"]),

    rating: toNumber(r["Review Rate"]),
    cost: toNumber(r["Cost"]),
    shippingCost: toNumber(r["Shipping Cost"]),

    mainCategory: toNull(r["Main Category Id"]),
    subCategory: toNull(r["Sub Category Id"]),

    minPrice: toNumber(r["Min Price"]),
    price: toNumber(r["Price"]),
    maxPrice: toNumber(r["Max Price"]),

    desi: toNumber(r["Desi"]),
    stock: toNumber(r["Stock"]),

    commission: toNumber(r["Amazon Commission"]),

    criteriaReason: toNull(r["Out Of Criteria Reason"]),
  };
}

module.exports = { normalizeRow };
