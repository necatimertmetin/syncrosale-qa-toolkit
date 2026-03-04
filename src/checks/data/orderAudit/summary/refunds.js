module.exports = function refunds(rows, summary) {
  let customerRefund = 0;
  let supplierRefund = 0;

  rows.forEach((r) => {
    customerRefund += r.customerRefund || 0;
    supplierRefund += r.supplierRefund || 0;
  });

  summary.customerRefund = Number(customerRefund.toFixed(2));
  summary.supplierRefund = Number(supplierRefund.toFixed(2));
};
