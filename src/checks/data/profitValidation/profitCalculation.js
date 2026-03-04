function resolveField(field, overridden, actual) {
  if (
    overridden &&
    overridden[field] !== undefined &&
    overridden[field] !== null
  ) {
    return overridden[field];
  }

  if (actual && actual[field] !== undefined && actual[field] !== null) {
    return actual[field];
  }

  return 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function calculateProfit({ overridden, actual }) {
  const salesPrice = resolveField("salesPrice", overridden, actual);
  const productCost = resolveField("productCost", overridden, actual);
  const shippingCost = resolveField("shippingCost", overridden, actual);
  const warehouseCost = resolveField("warehouseCost", overridden, actual);
  const commission = resolveField("commission", overridden, actual);
  const totalTax = resolveField("totalTax", overridden, actual);

  // const totalPromotionDiscount = resolveField(...)

  const buyerRefund = resolveField("buyerRefund", overridden, actual);
  const sellerRefund = resolveField("sellerRefund", overridden, actual);

  const profit = round2(
    salesPrice -
      productCost -
      shippingCost -
      warehouseCost -
      commission -
      totalTax -
      buyerRefund +
      sellerRefund,
  );

  return {
    profit,
    breakdown: {
      salesPrice: round2(salesPrice),
      productCost: round2(productCost),
      shippingCost: round2(shippingCost),
      warehouseCost: round2(warehouseCost),
      commission: round2(commission),
      totalTax: round2(totalTax),
      buyerRefund: round2(buyerRefund),
      sellerRefund: round2(sellerRefund),
    },
  };
}

module.exports = {
  calculateProfit,
  resolveField,
};
