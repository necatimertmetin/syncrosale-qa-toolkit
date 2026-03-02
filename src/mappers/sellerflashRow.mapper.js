const {
  cleanString,
  toNumber,
} = require("../checks/reconciliation/utils/sanitize");

function normalizeSellerflashRow(row) {
  return {
    asin: cleanString(row.ASIN),

    price: toNumber(row["Price"]),

    // ❌ yok → default
    quantity: 0,

    // 🔥 critical → filter bypass için sabit veriyoruz
    storeProductStatus: "ACTIVE",

    handlingTime: 0,

    source: "sellerflash",
  };
}

module.exports = { normalizeSellerflashRow };
