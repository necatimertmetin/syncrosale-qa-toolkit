const {
  cleanString,
  toNumber,
} = require("../checks/reconciliation/utils/sanitize");

function normalizeSyncroRow(row) {
  return {
    asin: cleanString(row.upperasin),

    price: toNumber(row.final_price),
    quantity: toNumber(row.stock),

    // 🔥 FIX
    storeProductStatus: cleanString(row.store_product_status),
    amazonListingStatus: cleanString(row.amazon_listings_item_status),

    handlingTime: toNumber(row.handling_time),

    source: "syncro",
  };
}

module.exports = { normalizeSyncroRow };
