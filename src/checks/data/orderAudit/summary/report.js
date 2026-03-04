function buildMarkdown(summary) {
  const lines = [];
  lines.push("## 🧠 Order Health\n");

  const health = Number(summary.orderHealth.replace("%", ""));

  function badge(v) {
    if (v >= 90) return "🟢 STABLE";
    if (v >= 75) return "🟡 ATTENTION";
    if (v >= 50) return "🟠 DEGRADED";
    return "🔴 CRITICAL";
  }

  lines.push(`### ${badge(health)} **${summary.orderHealth}**\n`);
  lines.push("_Operational reliability score across orders_\n");

  lines.push("---\n");

  // -------------------------
  // ORDER FLOW
  // -------------------------

  lines.push("## 📦 Order Flow\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Total Orders | ${summary.total} | Orders analyzed in dataset |`,
  );
  lines.push(
    `| Accepted Orders | ${summary.accepted} | Orders accepted by warehouse |`,
  );
  lines.push(
    `| Shipping Orders | ${summary.shipping} | Orders currently shipping |`,
  );
  lines.push(`| Cancelled Orders | ${summary.cancelled} | Cancelled orders |`);
  lines.push("");

  // -------------------------
  // FINANCIALS
  // -------------------------

  lines.push("## 💰 Financials\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Total Revenue | ${summary.totalRevenue.toFixed(2)} | Sum of order totals |`,
  );

  lines.push(
    `| Avg Order Value | ${summary.avgOrderValue.toFixed(2)} | Revenue / orders |`,
  );

  lines.push(
    `| Total Profit | ${summary.totalProfit.toFixed(2)} | Net profit across orders |`,
  );

  lines.push(
    `| Avg Margin | ${summary.avgMargin}% | Average margin per order |`,
  );

  lines.push(
    `| Amazon Commission | ${summary.totalCommission.toFixed(2)} | Total marketplace fees |`,
  );

  lines.push("");

  // -------------------------
  // REFUNDS
  // -------------------------

  lines.push("## 💸 Refunds\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Customer Refunds | ${summary.customerRefund.toFixed(2)} | Refunds issued to customers |`,
  );

  lines.push(
    `| Supplier Refunds | ${summary.supplierRefund.toFixed(2)} | Refunds received from suppliers |`,
  );

  lines.push("");

  // -------------------------
  // LOGISTICS
  // -------------------------

  lines.push("## 🚚 Logistics\n");

  lines.push("| Metric | Value | Description |");
  lines.push("|------|------|-------------|");

  lines.push(
    `| Shipping Orders | ${summary.shippingOrders} | Orders in shipping stage |`,
  );

  lines.push(
    `| Shipping Issues | ${summary.shippingIssues} | Shipping orders with problems |`,
  );

  lines.push(
    `| Pending Shipment | ${summary.pendingShipment} | Accepted but not shipped |`,
  );

  lines.push(`| Avg Desi | ${summary.avgDesi} | Average shipment volume |`);

  lines.push(
    `| High Desi Orders | ${summary.highDesiOrders} | Potentially expensive shipments |`,
  );

  lines.push("");

  // -------------------------
  // RISK
  // -------------------------

  lines.push("## ⚠️ Risk Breakdown\n");

  lines.push("| Level | Count |");
  lines.push("|------|------|");

  lines.push(`| LOW | ${summary.severity_LOW} |`);
  lines.push(`| MEDIUM | ${summary.severity_MEDIUM} |`);
  lines.push(`| HIGH | ${summary.severity_HIGH} |`);
  lines.push(`| CRITICAL | ${summary.severity_CRITICAL} |`);

  lines.push("");

  // -------------------------
  // WORST ORDERS
  // -------------------------

  if (summary.worstOrders && summary.worstOrders.length) {
    lines.push("## 🚨 Worst Orders\n");

    summary.worstOrders.forEach((o, i) => {
      lines.push(`${i + 1}. ${o.orderId} [profit: ${o.profit}]`);
    });

    lines.push("");
  }
  return lines.join("\n");
}

module.exports = { buildMarkdown };
