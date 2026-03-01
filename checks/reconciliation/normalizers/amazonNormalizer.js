const { cleanString, toNumber } = require("../utils/sanitize");
const { getField } = require("../utils/helpers");

function normalizeAmazonRow(row) {
  return {
    asin: cleanString(getField(row, ["asin", "asin1"])),
    price: toNumber(getField(row, ["price"])),
    quantity: toNumber(getField(row, ["quantity"])),

    status: cleanString(
      getField(row, ["status", "item-condition", "add-delete"]),
    ),

    fulfillmentChannel: cleanString(row["fulfillment-channel"]),
    handlingTime: toNumber(row["handling-time"]),

    source: "amazon",
  };
}

module.exports = { normalizeAmazonRow };
