const { cleanString, toNumber } = require("../utils/sanitize");

function normalizeSyncroRow(row) {
  return {
    asin: cleanString(row.upperasin), // 🔥 BURASI KRİTİK

    price: toNumber(row.final_price),
    quantity: toNumber(row.stock),

    status: cleanString(row.store_product_status),
    amazonStatus: cleanString(row.amazon_listings_item_status),

    handlingTime: toNumber(row.handling_time),

    source: "syncro",
  };
}

module.exports = { normalizeSyncroRow };
