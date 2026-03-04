module.exports = function health(summary) {
  const issueRate =
    (summary.oldAcceptedOrders + summary.cancelled) / summary.total;

  const health = 100 - issueRate * 100;

  summary.orderHealth = Number(health.toFixed(2)) + "%";
};
