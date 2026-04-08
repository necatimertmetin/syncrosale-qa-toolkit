/**
 * Desi Validation — validates physical dimensions vs desi calculation.
 *
 * Checks:
 *  - desi ≈ (H × L × W) / 3000  (cm-based volumetric weight)
 *  - desi present but dimensions missing
 *  - warehouseCost vs desi ratio outliers
 */

const DESI_TOLERANCE = 0.50; // 50% tolerance — desi may use shipping box dims, not product dims

// Unit → cm conversion factors
const TO_CM = {
  centimeters: 1, cm: 1,
  inches: 2.54, inch: 2.54, in: 2.54,
  meters: 100, m: 100,
  millimeters: 0.1, mm: 0.1,
};

function toCm(dim) {
  if (!dim || dim.value == null || dim.value <= 0) return null;
  const unit = (dim.unit || "").toLowerCase();
  const factor = TO_CM[unit];
  if (!factor) return dim.value; // unknown unit, use raw (assume cm)
  return dim.value * factor;
}

function runDesiValidation(detail) {
  if (!detail) return [];
  const { asin, price, marketplaceProduct } = detail;
  const results = [];

  const product = marketplaceProduct?.product;
  if (!product) return results;

  const { desi, height, length, width } = product;

  // desi present but no dimensions
  if (desi != null && desi > 0) {
    const hasAllDims = height?.value > 0 && length?.value > 0 && width?.value > 0;

    if (!hasAllDims) {
      results.push({
        type: "DESI_WITHOUT_DIMENSIONS",
        severity: "LOW",
        asin,
        desi,
      });
    } else {
      // convert to cm before computing volumetric weight
      const hCm = toCm(height);
      const lCm = toCm(length);
      const wCm = toCm(width);

      if (hCm && lCm && wCm) {
        const computed = (hCm * lCm * wCm) / 3000;
        const diff = Math.abs(computed - desi);
        const base = Math.max(computed, desi, 1);

        if (diff / base > DESI_TOLERANCE) {
          results.push({
            type: "DESI_CALCULATION_MISMATCH",
            severity: "LOW",
            asin,
            reportedDesi: desi,
            computedDesi: Number(computed.toFixed(2)),
            diffPct: Number(((diff / base) * 100).toFixed(2)),
            units: { h: height.unit, l: length.unit, w: width.unit },
          });
        }
      }
    }
  }

  // warehouseCost vs desi ratio — flag if warehouse cost seems disproportionate
  if (desi != null && desi > 0 && price?.warehouseCost != null && price.warehouseCost > 0) {
    const ratio = price.warehouseCost / desi;
    // These are just statistical markers, not hard failures
    if (ratio > 50) {
      results.push({
        type: "HIGH_WAREHOUSE_COST_PER_DESI",
        severity: "INFO",
        asin,
        warehouseCost: price.warehouseCost,
        desi,
        costPerDesi: Number(ratio.toFixed(2)),
      });
    }
  }

  return results;
}

module.exports = { runDesiValidation };
