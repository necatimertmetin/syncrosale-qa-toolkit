module.exports = function lifecycle(rows, summary) {
  let oldAccepted = 0;
  const now = Date.now();

  rows.forEach((r) => {
    const status = r.status || "";
    const date = new Date(r.purchaseDate).getTime();

    if (status === "ACCEPTED" && now - date > 48 * 3600 * 1000) {
      oldAccepted++;
    }
  });

  summary.oldAcceptedOrders = oldAccepted;
};
