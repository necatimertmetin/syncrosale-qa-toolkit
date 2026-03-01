const { isEqual } = require("../utils/helpers");

function compare(syncro, amazon) {
  return {
    priceDiff: syncro.price - amazon.price,
    quantityDiff: syncro.quantity - amazon.quantity,
    priceMatch: isEqual(syncro.price, amazon.price),
    quantityMatch: syncro.quantity === amazon.quantity,
  };
}

module.exports = { compare };
