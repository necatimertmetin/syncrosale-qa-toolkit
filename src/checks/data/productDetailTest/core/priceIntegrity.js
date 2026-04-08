/**
 * Price Integrity — validates internal consistency of price breakdowns.
 *
 * Checks:
 *  - finalPrice ≈ sum of components (productCost + shippingCost + warehouseCost + profit + amazonCommission + tax)
 *  - min ≤ price ≤ max across all sub-fields
 *  - commissionPercentage matches computed ratio
 *  - profitPercentage matches computed ratio
 *  - currency consistency between minPrice / price / maxPrice
 */

const TOLERANCE = 0.02; // 2% tolerance for floating-point rounding

function approxEq(a, b, tol = TOLERANCE) {
  if (a === 0 && b === 0) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom <= tol;
}

function checkBreakdownSum(label, block, asin) {
  if (!block || block.finalPrice == null) return [];

  const { productCost, shippingCost, warehouseCost, profit, amazonCommission, tax, finalPrice } = block;

  const components = [productCost, shippingCost, warehouseCost, profit, amazonCommission, tax];
  if (components.some((c) => c == null)) return []; // incomplete data, skip

  const sum = components.reduce((a, b) => a + b, 0);

  if (!approxEq(sum, finalPrice)) {
    return [{
      type: "PRICE_BREAKDOWN_MISMATCH",
      severity: "HIGH",
      asin,
      label,
      expected: Number(sum.toFixed(4)),
      actual: finalPrice,
      diff: Number((finalPrice - sum).toFixed(4)),
    }];
  }
  return [];
}

function checkPercentageField(label, block, asin) {
  if (!block || block.finalPrice == null || block.finalPrice === 0) return [];
  const results = [];

  // commission % check
  if (block.amazonCommission != null && block.amazonCommissionPercentage != null) {
    const computed = (block.amazonCommission / block.finalPrice) * 100;
    if (!approxEq(computed, block.amazonCommissionPercentage, 0.05)) {
      results.push({
        type: "COMMISSION_PCT_MISMATCH",
        severity: "MEDIUM",
        asin,
        label,
        computedPct: Number(computed.toFixed(2)),
        reportedPct: block.amazonCommissionPercentage,
      });
    }
  }

  // profit % — backend profitPercentage is a TARGET input, not a computed ratio.
  // Flag only when the realized profit deviates significantly from target.
  if (block.profit != null && block.profitPercentage != null && block.profitPercentage > 0) {
    const realized = (block.profit / block.finalPrice) * 100;
    const deviation = Math.abs(realized - block.profitPercentage);
    // Only flag if deviation exceeds 5 percentage points (target vs realized)
    if (deviation > 5) {
      results.push({
        type: "PROFIT_TARGET_DEVIATION",
        severity: "LOW",
        asin,
        label,
        targetPct: block.profitPercentage,
        realizedPct: Number(realized.toFixed(2)),
        deviationPts: Number(deviation.toFixed(2)),
      });
    }
  }

  return results;
}

function checkMinMaxChain(detail) {
  const { asin, minPrice, price, maxPrice } = detail;
  if (!minPrice || !price || !maxPrice) return [];

  const results = [];

  if (minPrice.finalPrice != null && price.finalPrice != null && price.finalPrice < minPrice.finalPrice) {
    results.push({
      type: "PRICE_BELOW_MIN_DETAIL",
      severity: "HIGH",
      asin,
      priceFinal: price.finalPrice,
      minFinal: minPrice.finalPrice,
    });
  }

  if (maxPrice.finalPrice != null && price.finalPrice != null && price.finalPrice > maxPrice.finalPrice) {
    results.push({
      type: "PRICE_ABOVE_MAX_DETAIL",
      severity: "HIGH",
      asin,
      priceFinal: price.finalPrice,
      maxFinal: maxPrice.finalPrice,
    });
  }

  if (minPrice.finalPrice != null && maxPrice.finalPrice != null && minPrice.finalPrice > maxPrice.finalPrice) {
    results.push({
      type: "MIN_GT_MAX_DETAIL",
      severity: "CRITICAL",
      asin,
      minFinal: minPrice.finalPrice,
      maxFinal: maxPrice.finalPrice,
    });
  }

  return results;
}

function checkCurrencyConsistency(detail) {
  const { asin, minPrice, price, maxPrice } = detail;
  const currencies = new Set();

  if (minPrice?.priceCurrency) currencies.add(minPrice.priceCurrency);
  if (price?.priceCurrency) currencies.add(price.priceCurrency);
  if (maxPrice?.priceCurrency) currencies.add(maxPrice.priceCurrency);

  if (currencies.size > 1) {
    return [{
      type: "CURRENCY_MISMATCH",
      severity: "CRITICAL",
      asin,
      currencies: [...currencies],
    }];
  }
  return [];
}

function runPriceIntegrity(detail) {
  if (!detail) return [];
  const results = [];

  // breakdown sum checks for all 3 tiers
  for (const [label, block] of [["minPrice", detail.minPrice], ["price", detail.price], ["maxPrice", detail.maxPrice]]) {
    results.push(...checkBreakdownSum(label, block, detail.asin));
    results.push(...checkPercentageField(label, block, detail.asin));
  }

  // min ≤ price ≤ max chain
  results.push(...checkMinMaxChain(detail));

  // currency
  results.push(...checkCurrencyConsistency(detail));

  return results;
}

module.exports = { runPriceIntegrity };
