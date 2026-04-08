/**
 * Data Freshness — detects stale or lagging data.
 *
 * Checks:
 *  - Supplier last update > threshold
 *  - Marketplace data last update > threshold
 *  - Amazon vs Syncro update time gap
 */

const SUPPLIER_STALE_DAYS = 7;
const MARKETPLACE_STALE_DAYS = 3;
const SYNC_GAP_HOURS = 24;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function hoursBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da) || isNaN(db)) return null;
  return Math.abs(da - db) / (1000 * 60 * 60);
}

function runDataFreshness(detail) {
  if (!detail) return [];
  const { asin, supplier, marketplaceProduct, updated, updatedAtAmazon } =
    detail;
  const results = [];

  // Stale supplier
  if (supplier?.updated) {
    const days = daysSince(supplier.updated);
    if (days != null && days > SUPPLIER_STALE_DAYS) {
      results.push({
        type: "STALE_SUPPLIER",
        severity: "MEDIUM",
        asin,
        daysSinceUpdate: Math.round(days),
        supplierUpdated: supplier.updated,
      });
    }
  }

  // Stale marketplace
  if (marketplaceProduct?.updated) {
    const days = daysSince(marketplaceProduct.updated);
    if (days != null && days > MARKETPLACE_STALE_DAYS) {
      results.push({
        type: "STALE_MARKETPLACE",
        severity: "LOW",
        asin,
        daysSinceUpdate: Math.round(days),
        marketplaceUpdated: marketplaceProduct.updated,
      });
    }
  }

  // Sync gap between Amazon and Syncro
  if (updated && updatedAtAmazon) {
    const gap = hoursBetween(updated, updatedAtAmazon);
    if (gap != null && gap > SYNC_GAP_HOURS) {
      results.push({
        type: "SYNC_LAG",
        severity: "MEDIUM",
        asin,
        gapHours: Math.round(gap),
        syncroUpdated: updated,
        amazonUpdated: updatedAtAmazon,
      });
    }
  }

  return results;
}

module.exports = { runDataFreshness };
