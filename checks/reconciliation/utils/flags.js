function buildFlags(row) {
  return {
    isOutOfStock: row.quantity === 0,
    isLowStock: row.quantity > 0 && row.quantity < 5,
    invalidHandlingTime: row.handlingTime < 0,
  };
}

module.exports = { buildFlags };
