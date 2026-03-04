const { parse } = require("csv-parse/sync");
const { buildSummary } = require("./summary/buildSummary");
const { buildMarkdown } = require("./summary/report");

/* ---------------- CSV PARSER ---------------- */

function parseCsv(text) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

/* ---------------- UTILS ---------------- */

function toNull(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "null" || s === "") return null;
  return v;
}

function toNumber(v) {
  if (!v || v === "null") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- NORMALIZER ---------------- */

function normalizeOrderRow(r) {
  return {
    orderId: toNumber(r["Order Id"]),
    amazonOrderId: r["Amazon Order Id"] || null,

    status: (r["Delivery Order Status"] || "").toUpperCase(),
    warehouseError: r["Warehouse Error Message"] || null,

    numberOfItems: toNumber(r["Number of Items"]),
    purchaseDate: r["Purchase Date"] || null,

    itemsShipped: toNumber(r["Items Shipped"]),
    itemsUnshipped: toNumber(r["Items Unshipped"]),

    orderTotal: toNumber(r["Order Total Amount"]),
    currency: r["Order Total Currency"],

    actualProductCost: toNumber(r["Actual Product Cost"]),
    warehouseCost: toNumber(r["Warehouse Cost"]),

    promotionDiscount: toNumber(r["Promotion Discount"]),
    amazonCommission: toNumber(r["Amazon Commission"]),

    totalTax: toNumber(r["Total Tax"]),

    customerRefund: toNumber(r["Customer Refund"]),
    supplierRefund: toNumber(r["Supplier Refund"]),

    desi: toNumber(r["Total Desi"]),
    profit: toNumber(r["Profit"]),
  };
}

/* ---------------- PROFIT CALC ---------------- */

function calculateProfit(row) {
  return (
    row.orderTotal -
    row.actualProductCost -
    row.warehouseCost -
    row.amazonCommission -
    row.totalTax -
    row.customerRefund -
    row.supplierRefund +
    row.promotionDiscount
  );
}

/* ---------------- BASE FIELDS ---------------- */

function base(row) {
  return {
    orderId: row.orderId,
    amazonOrderId: row.amazonOrderId,
    purchaseDate: row.purchaseDate,
  };
}

/* ---------------- MAIN AUDIT ---------------- */

function audit(csvText) {
  const rawRows = parseCsv(csvText);

  const rows = rawRows.map(normalizeOrderRow);

  const results = [];

  for (const r of rows) {
    const status = r.status;
    const itemsShipped = r.itemsShipped;
    const numberOfItems = r.numberOfItems;
    const profit = r.profit ?? calculateProfit(r);

    const b = base(r);

    /* SHIPPING ISSUE */

    if (status.includes("SHIP") && !itemsShipped) {
      results.push({
        type: "SHIPPING_ISSUE",
        ...b,
        status,
        itemsShipped,
      });
    }

    /* ITEM MISMATCH */

    if (itemsShipped && itemsShipped !== numberOfItems) {
      results.push({
        type: "ITEM_MISMATCH",
        ...b,
        numberOfItems,
        itemsShipped,
      });
    }

    /* CANCELLED */

    if (status === "CANCELLED") {
      results.push({
        type: "CANCELLED",
        ...b,
        status,
      });
    }

    /* MULTI ITEM */

    if (numberOfItems > 1) {
      results.push({
        type: "MULTI_ITEM",
        ...b,
        numberOfItems,
      });
    }

    /* NEGATIVE PROFIT */

    if (profit < 0) {
      const abs = Math.abs(profit);

      let level = "LOW";
      if (abs >= 10) level = "CRITICAL";
      else if (abs >= 5) level = "HIGH";
      else if (abs >= 1) level = "MEDIUM";

      results.push({
        type: "NEGATIVE_PROFIT",
        level,
        ...b,
        profit: Number(profit.toFixed(2)),
      });
    }
  }

  /* SUMMARY */

  const summary = buildSummary(rows);

  summary.prettyReport = buildMarkdown(summary);

  return [summary, ...results];
}

module.exports = { audit };
