/**
 * Status Anomalies — detects contradictory status combinations.
 *
 * Checks:
 *  - BUYABLE listing but non-ACTIVE store product
 *  - ACTIVE product with zero stock everywhere
 *  - OUT_OF_CRITERIA with empty reasons
 *  - everApproved but regressed to NO_DATA
 *  - BUYABLE listing + inactive supplier
 */

function runStatusAnomalies(detail) {
  if (!detail) return [];
  const {
    asin,
    storeProductStatus,
    storeProductSubStatus,
    amazonListingsItemStatus,
    outOfCriteriaReasons,
    everApproved,
    stock,
    inventoryStock,
    supplier,
  } = detail;

  const results = [];

  // Buyable but not active
  if (
    amazonListingsItemStatus === "BUYABLE" &&
    storeProductStatus !== "ACTIVE"
  ) {
    results.push({
      type: "BUYABLE_NOT_ACTIVE",
      severity: "HIGH",
      asin,
      amazonStatus: amazonListingsItemStatus,
      storeStatus: storeProductStatus,
    });
  }

  // Active but zero stock
  if (
    storeProductStatus === "ACTIVE" &&
    stock === 0 &&
    (inventoryStock == null || inventoryStock === 0)
  ) {
    results.push({
      type: "ACTIVE_ZERO_STOCK",
      severity: "MEDIUM",
      asin,
      stock,
      inventoryStock: inventoryStock ?? 0,
    });
  }

  // Out of criteria with no reasons
  if (storeProductStatus === "OUT_OF_CRITERIA") {
    const reasons = outOfCriteriaReasons || [];
    if (reasons.length === 0) {
      results.push({
        type: "OUT_OF_CRITERIA_NO_REASON",
        severity: "MEDIUM",
        asin,
      });
    }
  }

  // Ever approved but regressed to NO_DATA
  if (everApproved === true && storeProductStatus === "NO_DATA") {
    results.push({
      type: "APPROVED_REGRESSED_NO_DATA",
      severity: "HIGH",
      asin,
    });
  }

  // Buyable + inactive supplier
  if (amazonListingsItemStatus === "BUYABLE" && supplier?.active === false) {
    results.push({
      type: "BUYABLE_INACTIVE_SUPPLIER",
      severity: "CRITICAL",
      asin,
      supplierName: supplier.supplierName,
    });
  }

  return results;
}

module.exports = { runStatusAnomalies };
