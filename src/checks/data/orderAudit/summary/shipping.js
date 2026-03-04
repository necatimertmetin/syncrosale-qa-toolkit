module.exports = function shipping(rows, summary) {
  let shippingIssues = 0;
  let shipped = 0;
  let pendingShipment = 0;

  rows.forEach((r) => {
    const status = r.status || "";
    const shippedItems = r.itemsShipped || 0;
    const items = r.numberOfItems || 0;

    if (status.includes("SHIP")) {
      shipped++;

      if (shippedItems === 0) {
        shippingIssues++;
      }
    }

    if (status === "ACCEPTED" && items > 0 && shippedItems === 0) {
      pendingShipment++;
    }
  });

  summary.shippingOrders = shipped;
  summary.shippingIssues = shippingIssues;
  summary.pendingShipment = pendingShipment;
};
