const {
  cleanString,
  toNumber,
} = require("../checks/reconciliation/utils/sanitize");
const { getField } = require("../checks/reconciliation/utils/helpers");

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
