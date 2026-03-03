const { parseCSV } = require("../../parsers/csvParser");

// utils
function toNull(v) {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "null" || s === "") return null;
  return v;
}

function toNumber(v) {
  const val = toNull(v);
  if (val === null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// 🔥 SADECE BARCODE VARSA
function calculateProfit(row) {
  const barcode = toNull(row["Barcode"]);
  if (!barcode) return null;

  const orderTotal = toNumber(row["Order Total Amount"]) || 0;
  const cost = toNumber(row["Actual Product Cost"]) || 0;
  const warehouse = toNumber(row["Warehouse Cost"]) || 0;
  const commission = toNumber(row["Amazon Commission"]) || 0;
  const tax = toNumber(row["Total Tax"]) || 0;
  const discount = toNumber(row["Promotion Discount"]) || 0;
  const customerRefund = toNumber(row["Customer Refund"]) || 0;
  const supplierRefund = toNumber(row["Supplier Refund"]) || 0;

  return (
    orderTotal -
    cost -
    warehouse -
    commission -
    tax -
    customerRefund -
    supplierRefund +
    discount
  );
}

function base(row) {
  return {
    orderId: row["Order Id"],
    amazonOrderId: row["Amazon Order Id"],
    purchaseDate: row["Purchase Date"],
  };
}

function audit(csvText) {
  const rows = parseCSV(csvText);

  const results = [];

  let shippingIssues = 0;
  let mismatchItems = 0;
  let cancelled = 0;
  let multiItem = 0;
  let negativeProfit = 0;

  const breakdown = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const r of rows) {
    const status = toNull(r["Delivery Order Status"]);
    const itemsShipped = toNumber(r["Items Shipped"]);
    const numberOfItems = toNumber(r["Number of Items"]);
    const profit = calculateProfit(r);

    const b = base(r);

    // 1️⃣ SHIPPING
    if ((status || "").toUpperCase().includes("SHIP")) {
      if (itemsShipped === null || itemsShipped === 0) {
        shippingIssues++;

        results.push({
          type: "SHIPPING_ISSUE",
          ...b,
          status,
          itemsShipped,
        });
      }
    }

    // 2️⃣ mismatch
    if (
      itemsShipped !== null &&
      itemsShipped !== 0 &&
      numberOfItems !== null &&
      itemsShipped !== numberOfItems
    ) {
      mismatchItems++;

      results.push({
        type: "ITEM_MISMATCH",
        ...b,
        numberOfItems,
        itemsShipped,
      });
    }

    // 3️⃣ cancelled
    if ((status || "").toUpperCase() === "CANCELLED") {
      cancelled++;

      results.push({
        type: "CANCELLED",
        ...b,
        status,
      });
    }

    // 4️⃣ multi item
    if (numberOfItems !== null && numberOfItems > 1) {
      multiItem++;

      results.push({
        type: "MULTI_ITEM",
        ...b,
        numberOfItems,
      });
    }

    // 5️⃣ negative profit
    if (profit !== null && profit < 0) {
      negativeProfit++;

      const abs = Math.abs(profit);

      let level = "LOW";
      if (abs >= 10) level = "CRITICAL";
      else if (abs >= 5) level = "HIGH";
      else if (abs >= 1) level = "MEDIUM";

      breakdown[level]++;

      results.push({
        type: "NEGATIVE_PROFIT",
        level,
        ...b,
        profit: Number(profit.toFixed(2)),
      });
    }
  }

  const summary = {
    type: "SUMMARY",
    total: rows.length,
    shippingIssues,
    mismatchItems,
    cancelled,
    multiItem,
    negativeProfit,
    negative_LOW: breakdown.LOW,
    negative_MEDIUM: breakdown.MEDIUM,
    negative_HIGH: breakdown.HIGH,
    negative_CRITICAL: breakdown.CRITICAL,
  };

  return [summary, ...results];
}

module.exports = { audit };
