/**
 * Supplier Cross-Check — validates supplier data vs pricing data consistency.
 *
 * Checks:
 *  - supplier.cost vs price.productCost alignment
 *  - supplier.deliveryCost vs price.shippingCost alignment
 *  - supplier.stock vs product stock consistency
 *  - inactive supplier with active product
 *  - pricing present without supplier
 */

const COST_TOLERANCE = 0.05; // 5% tolerance

function runSupplierCrossCheck(detail) {
  if (!detail) return [];
  const { asin, supplier, price, stock, inventoryStock, storeProductStatus } = detail;
  const results = [];

  // No supplier but product has cost data
  if (!supplier && price?.productCost > 0) {
    results.push({
      type: "PRICE_WITHOUT_SUPPLIER",
      severity: "HIGH",
      asin,
      productCost: price.productCost,
    });
    return results; // no further supplier checks possible
  }

  if (!supplier) return results;

  // Cost alignment
  if (supplier.cost != null && price?.productCost != null) {
    const diff = Math.abs(supplier.cost - price.productCost);
    const base = Math.max(supplier.cost, price.productCost, 1);
    if (diff / base > COST_TOLERANCE) {
      results.push({
        type: "SUPPLIER_COST_MISMATCH",
        severity: "HIGH",
        asin,
        supplierCost: supplier.cost,
        pricingProductCost: price.productCost,
        diffPct: Number(((diff / base) * 100).toFixed(2)),
      });
    }
  }

  // Delivery cost alignment
  if (supplier.deliveryCost != null && price?.shippingCost != null) {
    const diff = Math.abs(supplier.deliveryCost - price.shippingCost);
    const base = Math.max(supplier.deliveryCost, price.shippingCost, 1);
    if (diff / base > COST_TOLERANCE) {
      results.push({
        type: "SUPPLIER_DELIVERY_COST_MISMATCH",
        severity: "MEDIUM",
        asin,
        supplierDeliveryCost: supplier.deliveryCost,
        pricingShippingCost: price.shippingCost,
        diffPct: Number(((diff / base) * 100).toFixed(2)),
      });
    }
  }

  // Stock consistency
  if (supplier.stock != null && stock != null) {
    if (supplier.stock > 0 && stock === 0) {
      results.push({
        type: "SUPPLIER_HAS_STOCK_PRODUCT_ZERO",
        severity: "MEDIUM",
        asin,
        supplierStock: supplier.stock,
        productStock: stock,
      });
    }
    if (supplier.stock === 0 && stock > 0) {
      results.push({
        type: "SUPPLIER_NO_STOCK_PRODUCT_HAS",
        severity: "MEDIUM",
        asin,
        supplierStock: supplier.stock,
        productStock: stock,
      });
    }
  }

  // Inactive supplier + active product
  if (supplier.active === false && storeProductStatus === "ACTIVE") {
    results.push({
      type: "INACTIVE_SUPPLIER_ACTIVE_PRODUCT",
      severity: "CRITICAL",
      asin,
      supplierName: supplier.supplierName,
      supplierId: supplier.supplierId,
    });
  }

  return results;
}

module.exports = { runSupplierCrossCheck };
